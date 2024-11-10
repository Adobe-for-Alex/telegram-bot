import express from 'express'
import { Context, Markup, session, Telegraf } from 'telegraf'

const app = express()
app.get('/', async (req, res, next) => {
  const name = req.query['name']
  res.send(name ? `Hello Mr. ${name}` : 'Hello World!')
  next()
})
app.listen(8080, () => console.log('Server started'))

const token = process.env['TELEGRAM_BOT_TOKEN']
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is undefined')
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

type Stage = 'new'
  | 'no-subscription'
  | 'choosing-plan'
  | 'choose-1-month'
  | 'choose-3-months'
  | 'choose-6-months'
  | 'wait-approove'
  | 'with-subscription'

interface ContextWithSession extends Context {
  session: {
    stage: Stage
  }
}

type Plan = {
  price: number,
  monthsDuration: number,
  action: string,
  stage: Stage
}
const plans: Plan[] = [
  {
    price: 2,
    monthsDuration: 1,
    action: 'subscribe-months-1',
    stage: 'choose-1-month'
  },
  {
    price: 5,
    monthsDuration: 3,
    action: 'subscribe-months-3',
    stage: 'choose-3-months'
  },
  {
    price: 2,
    monthsDuration: 6,
    action: 'subscribe-months-6',
    stage: 'choose-6-months'
  },
]

const bot = new Telegraf<ContextWithSession>(token)
bot.use(session({ defaultSession: () => ({ stage: <Stage>'new' }) }))

const stageStep = <C extends ContextWithSession>
  (expect: Stage, success: Stage) =>
  async (ctx: C, next: () => Promise<void>): Promise<void> => {
    if (ctx.session.stage !== expect) return
    ctx.session.stage = success
    return next()
  }

bot.start(stageStep('new', 'no-subscription'), async ctx => {
  await ctx.reply(
    'Привет! Добро пожаловать в наш сервис.',
    {
      reply_markup: {
        keyboard: [
          [Markup.button.text('Оформить подписку')],
        ],
        resize_keyboard: true
      }
    }
  )
})

bot.hears('Оформить подписку', stageStep('no-subscription', 'choosing-plan'), async ctx => {
  await ctx.reply(
    'Отлично! Давайте оформим подписку. Какой период вас интересует?',
    {
      reply_markup: {
        inline_keyboard: [
          plans.map(x => Markup.button.callback(`${x.monthsDuration} месяцев - $${x.price}`, x.action))
        ],
        keyboard: []
      }
    })
})

plans.forEach(plan => bot.action(plan.action, stageStep('choosing-plan', plan.stage), async ctx => {
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] })
  await ctx.reply(`Вы выбрали подписку на ${plan.monthsDuration} месяцев.
Стоимость: $${plan.price}

Пожалуйста, вышлите мне чек оплаты в виде файла.
Реквизиты для оплаты: <реквизиты>`
  )
}))

type UserId = number
type MessageId = number
const payments: Record<UserId, MessageId> = {}

type Price = number
type Payment = {
  user: UserId,
  receipt: MessageId,
  price: Price
}
const approoveRequests: Record<UserId, Payment> = {}

plans.forEach(plan => bot.on('document', stageStep(plan.stage, 'wait-approove'), async ctx => {
  payments[ctx.message.from.id] = ctx.message.message_id
  const admin = anyAdmin()
  if (!admin) {
    await ctx.reply('К сожалению сейчас нету доступных администраторов для проверки вашего чека. Попробуйте позже.')
    return
  }
  approoveRequests[admin] = {
    user: ctx.message.from.id,
    receipt: ctx.message.message_id,
    price: plan.price
  }
  await ctx.forwardMessage(admin)
  await ctx.telegram.sendMessage(
    admin,
    `Пользователь ${ctx.message.from.username || ctx.message.from.id} отправил чек оплаты на сумму $${plan.price}`,
    Markup.inlineKeyboard([
      [Markup.button.callback('Принять', 'approove'), Markup.button.callback('Отклонить', 'reject')]
    ])
  )
  await ctx.reply('Спасибо! Ваш чек отправлен на проверку администратору. Ожидайте подтверждения.')
}))

bot.action('approove', async ctx => {
  const payment = approoveRequests[ctx.from.id]
  if (!payment) return
  delete approoveRequests[ctx.from.id]
  await ctx.telegram.sendMessage(payment.user, `Оплата подтверждена! Ваша подписка активирована.
Ваш аккаунт:
Логин: user123@example.com
Пароль: zjasd@&e72q878RHIS`)
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] })
})

bot.action('reject', async ctx => {
  const payment = approoveRequests[ctx.from.id]
  if (!payment) return
  delete approoveRequests[ctx.from.id]
  await ctx.telegram.sendMessage(payment.user, `К сожалению ваш платеж был отклонен. Свяжитесь с администрацией.`)
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] })
})

bot.launch(() => console.log('Bot started'))
