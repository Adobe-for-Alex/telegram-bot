import { Api, InlineKeyboard, Middleware } from "grammy";
import Admin from "../admin/Admin";
import Admins from "./Admins";
import { PrismaClient } from "@prisma/client";
import Users from "../users/Users";
import Plans from "../plans/Plans";
import Sessions from "../sessions/Sessions";
import DiscountService from "../discount/discount";

export default class AdminsInPrisma implements Admins {
  constructor(
    private readonly api: Api,
    private readonly prisma: PrismaClient
  ) { }
  async any(): Promise<Admin> {
    return {
      requestCheck: async (plan, user, discount: [number, number], messageId, filePath) => {
        const payment = await this.prisma.payment.create({
          data: {
            userId: await user.id(),
            planId: await plan.id(),
            receiptUrl: filePath
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
Тариф: ${await plan.asString()}
Персональная скидка: ${discount[0]}%
С учётом персональной скидки ${discount[1]}`,
          {
            reply_markup: new InlineKeyboard()
              .text('Подтвердить', `approve-${request.paymentId}`)
              .text('Отклонить', `reject-${request.paymentId}`)
          }
        )
      }
    }
  }
  middleware(plans: Plans, users: Users, sessions: Sessions, discounts: DiscountService): Middleware {
    return async (ctx, next) => {
      const match = /^(approve|reject)-(.*)$/.exec(ctx.callbackQuery?.data || '')
      if (match === null) return next()
      const requestId = Number(match[2])
      const request = await this.prisma.checkPaymentRequest.findFirst({
        where: { paymentId: requestId },
        include: { payment: { include: { user: true } } }
      })
      if (!request) throw new Error(`Request ${requestId} not found`)
      const userId = request.payment.user.id
      const user = await users.withId(userId)
      switch (match[1]) {
        case 'approve': {
          await this.prisma.approve.create({ data: { requestId } })
          await plans.withId(request.payment.planId).then(x => x?.extendSubscrptionFor(user))
          await sessions.forUser(await user.id())
          await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
          await ctx.api.sendMessage(
            userId,
            `Ваш платеж одобрен!
Данные вашей подписки:

${await user.subscrption().then(x => x?.asString())}`)
          await discounts.removePersonalDiscount(request.payment.user.id);
          break;
        }
        case 'reject': {
          await this.prisma.reject.create({ data: { requestId, reason: 'Not implemented' } })
          await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
          await ctx.api.sendMessage(userId, 'Ваш платеж отклонен. Для возврата средств свяжитесь с администратором')
          break;
        }
      }
    }
  }
}
