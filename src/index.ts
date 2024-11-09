import express from 'express'
import { Markup, Telegraf } from 'telegraf'
import { PrismaClient } from '@prisma/client'


const app = express()
app.get('/', async (req, res, next) => {
  const name = req.query['name']
  res.send(name ? `Hello Mr. ${name}` : 'Hello World!')
  next()
})
app.listen(8080, () => console.log('Server started'))

const prisma = new PrismaClient()
type UserId = number


async function saveSession(userId: UserId, stage: string) {
  try {
    const session = await prisma.session.create({
      data: {
        userId,
        stage,
        lastUpdate: new Date()
      },
    })
    console.log('Сессия сохранена:', session)
    return session
  } catch (error) {
    console.error('Ошибка при сохранении сессии:', error)
    throw error
  }
}


async function logRequest(userId: UserId, requestType: string, details: string = '') {
  try {
    const request = await prisma.request.create({
      data: {
        userId,
        type: requestType,
        details,
        createdAt: new Date()
      },
    })
    console.log('Запрос сохранен:', request)
    return request
  } catch (error) {
    console.error('Ошибка при логировании запроса:', error)
    throw error
  }
}

async function saveSubscription(userId: UserId, monthsDuration: number, price: number) {
  try {
    const startDate = new Date()
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + monthsDuration)

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: `${monthsDuration} месяцев`,
        price,
        startDate,
        endDate,
        status: 'active'
      },
    })
    console.log('Подписка сохранена:', subscription)
    return subscription
  } catch (error) {
    console.error('Ошибка при сохранении подписки:', error)
    throw error
  }
}

const token = process.env['TELEGRAM_BOT_TOKEN']
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is undefined')
const bot = new Telegraf(token)

bot.command('start', async (ctx) => {
  await saveSession(ctx.chat?.id || -1, 'start')
  await ctx.reply(
    'Привет! Добро пожаловать в наш сервис.',
    {
      reply_markup: {
        keyboard: [
          [Markup.button.callback('Оформить подписку', 'subscribe')],
        ],
        resize_keyboard: true
      }
    }
  )
})

bot.hears('Оформить подписку', Telegraf.reply(
  'Отлично! Давайте оформим подписку. Какой период вас интересует?',
  {
    reply_markup: {
      inline_keyboard: [
        [Markup.button.callback('1 месяц - $2', 'subscribe-months-1')],
        [Markup.button.callback('3 месяца - $5', 'subscribe-months-3')],
        [Markup.button.callback('6 месяцев - $10', 'subscribe-months-6')]
      ],
    }
  }
))

const chain = <C,>(...fns: ((ctx: C) => void)[]) => (ctx: C) => { fns.forEach(x => x(ctx)) }

bot.action('subscribe-months-1', chain(
  async ctx => {
    await logRequest(ctx.chat?.id || -1, 'Выбор подписки', '1 месяц')
    await ctx.deleteMessage()
  },
  ctx => ctx.reply(
    `Вы выбрали подписку на 1 месяц.\nСтоимость: $2\n\nПожалуйста, вышлите мне чек оплаты в виде файла.\nРеквизиты для оплаты: <реквизиты>`
  ),
  ctx => { requests[ctx.chat?.id || -1] = 2 }
))

bot.action('subscribe-months-3', chain(
  async ctx => {
    await logRequest(ctx.chat?.id || -1, 'Выбор подписки', '3 месяца')
    await ctx.deleteMessage()
  },
  ctx => ctx.reply(
    `Вы выбрали подписку на 3 месяца.\nСтоимость: $5\n\nПожалуйста, вышлите мне чек оплаты в виде файла.\nРеквизиты для оплаты: <реквизиты>`
  ),
  ctx => { requests[ctx.chat?.id || -1] = 5 }
))

bot.action('subscribe-months-6', chain(
  async ctx => {
    await logRequest(ctx.chat?.id || -1, 'Выбор подписки', '6 месяцев')
    await ctx.deleteMessage()
  },
  ctx => ctx.reply(
    `Вы выбрали подписку на 6 месяцев.\nСтоимость: $10\n\nПожалуйста, вышлите мне чек оплаты в виде файла.\nРеквизиты для оплаты: <реквизиты>`
  ),
  ctx => { requests[ctx.chat?.id || -1] = 10 }
))

async function getUsersWithExpiringSubscriptions() {
  const daysBeforeExpiry = 5;
  const today = new Date();
  const expiryThreshold = new Date(today);
  expiryThreshold.setDate(today.getDate() + daysBeforeExpiry);
  const subscriptions = await prisma.subscription.findMany({
    where: {
      endDate: {
        lt: expiryThreshold,
      },
      status: 'active',
    },
    include: {
      user: true,
    },
  });
  return subscriptions.map((subscription: { user: { userId: number } }) => subscription.user);
}

const checkSubscriptionExpiry = async () => {
  const usersToNotify = await getUsersWithExpiringSubscriptions();
  usersToNotify.forEach((user: { userId: number }) => {
    bot.telegram.sendMessage(
      user.userId,
      'Ваша подписка скоро истечет. Хотите продлить?',
      Markup.inlineKeyboard([
        Markup.button.callback('Да', 'renew'),
        Markup.button.callback('Нет', 'decline_renewal')
      ])
    )
  })
}
setInterval(checkSubscriptionExpiry, 24 * 60 * 60 * 1000)

type MessageId = number
const payments: Record<UserId, MessageId> = {}

const adminsInEnv = process.env['ADMINS']
if (!adminsInEnv) throw new Error('ADMINS is undefined or empty')
const admins: UserId[] = adminsInEnv.split(',').map(Number)
const anyAdmin = () => {
  for (const admin of admins) {
    if (admin in approoveRequests) continue
    return admin
  }
  return undefined
}

type Price = number
type Payment = {
  user: UserId,
  receipt: MessageId,
  price: Price
}
const requests: Record<UserId, Price> = {}
const approoveRequests: Record<UserId, Payment> = {}

bot.on('document', async ctx => {
  const price = requests[ctx.message.from.id]
  if (!price) return
  delete requests[ctx.message.from.id]
  payments[ctx.message.from.id] = ctx.message.message_id
  const admin = anyAdmin()
  if (!admin) {
    await ctx.reply('К сожалению сейчас нету доступных администраторов для проверки вашего чека. Попробуйте позже.')
    return
  }
  approoveRequests[admin] = {
    user: ctx.message.from.id,
    receipt: ctx.message.message_id,
    price: price
  }
  await ctx.forwardMessage(admin)
  await ctx.telegram.sendMessage(
    admin,
    `Пользователь ${ctx.message.from.username || ctx.message.from.id} отправил чек оплаты на сумму $${price}`,
    Markup.inlineKeyboard([
      [Markup.button.callback('Принять', 'approove'), Markup.button.callback('Отклонить', 'reject')]
    ])
  )
  await ctx.reply('Спасибо! Ваш чек отправлен на проверку администратору. Ожидайте подтверждения.')
})

bot.action('approove', chain(
  async ctx => {
    const payment = approoveRequests[ctx.from.id]
    if (!payment) return
    delete approoveRequests[ctx.from.id]
    await saveSubscription(payment.user, payment.price === 2 ? 1 : payment.price === 5 ? 3 : 6, payment.price)
    await ctx.telegram.sendMessage(payment.user, `Оплата подтверждена! Ваша подписка активирована.\nВаш аккаунт:\nЛогин: user123@example.com\nПароль: zjasd@&e72q878RHIS`)
  },
  ctx => ctx.editMessageReplyMarkup({ inline_keyboard: [] }),
))

bot.action('reject', chain(
  async ctx => {
    const payment = approoveRequests[ctx.from.id]
    if (!payment) return
    delete approoveRequests[ctx.from.id]
    await ctx.telegram.sendMessage(payment.user, `К сожалению ваш платеж был отклонен. Свяжитесь с администрацией.`)
  },
  ctx => ctx.editMessageReplyMarkup({ inline_keyboard: [] }),
))

bot.launch(() => console.log('Bot started'))
