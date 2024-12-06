import { Api, InlineKeyboard, Middleware } from "grammy";
import Admin from "../admin/Admin";
import { UserId } from "../aliases";
import Users from "../users/Users";

export default interface Admins {
  any(): Promise<Admin>;
}

export class FakeAdmins implements Admins {
  constructor(
    private readonly api: Api,
    private readonly users: Users,
    private readonly admins: UserId[]
  ) { }
  async any(): Promise<Admin> {
    if (this.admins.length < 0) throw new Error('There is not a single admin')
    const adminId = this.admins[Math.floor(this.admins.length * Math.random())]
    if (adminId === undefined) throw new Error('For some reason adminId is undefined')
    return {
      requestCheck: async (plan, user, messageId) => {
        await this.api.forwardMessage(adminId, await user.id(), messageId)
        await this.api.sendMessage(
          adminId,
          `Запрос на проверку оплаты
Пользователь: ${await user.id()}
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
  middleware(): Middleware {
    return async (ctx, next) => {
      const match = /^(approve|reject)-(.*)$/.exec(ctx.callbackQuery?.data || '')
      if (match === null) return next()
      switch (match[1]) {
        case 'approve': {
          const userId = match[2]
          if (userId === undefined)
            throw Error(`User ID is undefined for approve!`)
          const user = await this.users.withId(userId)
          await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
          await ctx.api.sendMessage(
            userId,
            `Ваш платеж одобрен!
Данные вашей подписки:

${await user.subscrption().then(x => x?.asString())}`)
          break;
        }
        case 'reject': {
          const userId = match[2]
          if (userId === undefined)
            throw Error(`User ID is undefined for reject!`)
          await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
          await ctx.api.sendMessage(userId, 'Ваш платеж отклонен. Для возврата средств свяжитесь с администратором')
          break;
        }
      }
    }
  }
}
