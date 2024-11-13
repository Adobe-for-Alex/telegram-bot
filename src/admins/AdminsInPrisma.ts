import { Api, InlineKeyboard, Middleware } from "grammy";
import Admin from "../admin/Admin";
import Admins from "./Admins";
import { PrismaClient } from "@prisma/client";
import Users from "../users/Users";

export default class AdminsInPrisma implements Admins {
  constructor(
    private readonly api: Api,
    private readonly prisma: PrismaClient
  ) { }
  async any(): Promise<Admin> {
    return {
      requestCheck: async (plan, user, messageId) => {
        const payment = await this.prisma.payment.create({
          data: {
            userId: await user.id(),
            planId: await plan.id(),
            receiptUrl: 'stub'
          }
        })
        const { userId: admin } = await this.prisma.admin.findFirst({
          select: { userId: true },
          orderBy: { requests: { _count: 'asc' } }
        }) || {}
        if (admin === undefined) throw new Error('No Admins')
        const request = await this.prisma.checkPaymentRequest.create({
          data: {
            paymentId: payment.id,
            adminId: admin
          }
        })
        await this.api.forwardMessage(admin, await user.id(), messageId)
        await this.api.sendMessage(
          admin,
          `Запрос на проверку оплаты
Пользователь: ${await user.id()}
Тариф: ${await plan.asString()}`,
          {
            reply_markup: new InlineKeyboard()
              .text('Подтвердить', `approve-${request.paymentId}`)
              .text('Отклонить', `reject-${request.paymentId}`)
          }
        )
      }
    }
  }
  middleware(users: Users): Middleware {
    return async (ctx, next) => {
      const match = /^(approve|reject)-(.*)$/.exec(ctx.callbackQuery?.data || '')
      if (match === null) return next()
      const requestId = Number(match[2])
      const request = await this.prisma.checkPaymentRequest.findFirst({
        where: { paymentId: requestId },
        include: { payment: { include: { user: true } } }
      })
      if (!request) throw new Error(`Request ${requestId} not found`)
      const user = request.payment.user.id
      switch (match[1]) {
        case 'approve': {
          await this.prisma.approve.create({ data: { requestId } })
          await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
          await ctx.api.sendMessage(
            user,
            `Ваш платеж одобрен!
Данные вашей подписки:

${await users.withId(user).then(x => x.subscrption()).then(x => x?.asString())}`)
          break;
        }
        case 'reject': {
          await this.prisma.reject.create({ data: { requestId, reason: 'Not implemented' } })
          await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
          await ctx.api.sendMessage(user, 'Ваш платеж отклонен. Для возврата средств свяжитесь с администратором')
          break;
        }
      }
    }
  }
}
