import { Menu, MenuRange } from "@grammyjs/menu"
import { Bot, Context, InlineKeyboard, Keyboard, session, SessionFlavor } from "grammy"
import { PlanId } from "./aliases"
import { FakePlans } from "./plans/Plans"
import Admins from "./admins/Admins"
import { FakeUsers } from "./users/Users"
import { FakePlan } from "./plan/Plan"

const plans = new FakePlans({
  1: new FakePlan(1, '1 месяц - $2'),
  2: new FakePlan(2, '3 месяц - $5'),
  3: new FakePlan(3, '6 месяц - $10'),
})
const users = new FakeUsers()

interface Session {
  planId?: PlanId,
}
type ContextWithSession = Context & SessionFlavor<Session>

const token = process.env['TELEGRAM_BOT_TOKEN']
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is undefined')
const bot = new Bot<ContextWithSession>(token)
bot.use(session({ initial: () => ({}) }))

const admins: Admins = {
  any: async () => {
    return {
      requestCheck: async (plan, user, messageId) => {
        const adminId = 588786574
        await bot.api.forwardMessage(adminId, await user.id(), messageId)
        await bot.api.sendMessage(
          adminId,
          `Запрос на проверку оплаты
Пользователь: ${await user.name()}
Тариф: ${await plan.asString()}`,
          {
            reply_markup: new InlineKeyboard()
              .text('Подтвердить', `approve-${await user.id()}`)
              .text('Отклонить', `reject-${await user.id()}`)
          }
        )
      }
    }
  }
}

bot.on('callback_query:data', async (ctx, next) => {
  const match = /^approve-(.*)$/.exec(ctx.callbackQuery.data)
  if (match === null) return next()
  const userId = Number(match[1])
  const user = await users.withId(userId)
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
  await ctx.api.sendMessage(
    userId,
    `Ваш платеж одобрен!
Данные вашей подписки:

${await user.subscrption().then(x => x?.asString())}`)
})

bot.on('callback_query:data', async (ctx, next) => {
  const match = /^reject-(.*)$/.exec(ctx.callbackQuery.data)
  if (match === null) return next()
  const userId = Number(match[1])
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
  await ctx.api.sendMessage(userId, 'Ваш платеж отклонен. Для возврата средств свяжитесь с администратором')
})

const paymentMenu = new Menu<ContextWithSession>('payment-menu')
  .text('Отменить', async ctx => {
    if (ctx.session.planId === undefined) return
    delete ctx.session.planId
    await ctx.reply('Оплата отменена')
  })
bot.use(paymentMenu.middleware())

const newSubscrptionMenu = new Menu<ContextWithSession>('new-subscription')
  .dynamic(async () => {
    const range = new MenuRange<ContextWithSession>()
    for (const plan of await plans.all()) {
      range.text(await plan.asString(), async ctx => {
        await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
        ctx.session.planId = await plan.id()
        await ctx.reply(
          `Вы выбрали тариф: ${await plan.asString()}
Вам необходимо оплатить его и отправить нам чек
Реквезиты для оплаты: <реквезиты>`,
          { reply_markup: paymentMenu }
        )
      }).row()
    }
    return range
  })
bot.use(newSubscrptionMenu.middleware())

bot.command('start', async ctx => {
  await ctx.reply(
    'Привет! Добро пожаловать в наш сервис.',
    {
      reply_markup: new Keyboard()
        .text('Текущая подписка').row()
        .text('Продлить подписку').row()
        .resized()
    }
  )
})

bot.hears('Текущая подписка', async ctx => {
  if (ctx.from === undefined) return
  const user = await users.withId(ctx.from.id)
  const subscrption = await user.subscrption()
  if (subscrption === undefined || await subscrption.ended() < new Date()) {
    await ctx.reply('У вас сейчас нету подписки')
    return
  }
  await ctx.reply(await subscrption.asString())
})

bot.hears('Продлить подписку', async ctx => {
  await ctx.reply(
    'Отлично! Выберете нужный вам тариф.',
    { reply_markup: newSubscrptionMenu }
  )
})

bot.on('message:document', async ctx => {
  const planId = ctx.session.planId
  if (planId === undefined) return
  const plan = await plans.withId(planId)
  if (!plan) {
    await ctx.reply('Ошибка! Выбранный вами тариф не найден. Для возврата средств обратитесь к администратору')
    return
  }
  delete ctx.session.planId
  const admin = await admins.any()
  try {
    await admin.requestCheck(plan, await users.withId(ctx.from.id), ctx.message.message_id)
  } catch (e) {
    await ctx.reply('Ошибка! Что-то пошло не так, когда мы направляли запрос администратору. Для возврата средств обратитесь к администратору')
    throw e
  }
  await ctx.reply('Ваш чек был отправлен администратору для проверки. Ожидайте подтверждения')
})

bot.catch(details => console.error(details.error))
bot.start({ onStart: () => console.log('Bot started') })
