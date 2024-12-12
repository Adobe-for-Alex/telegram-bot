import {PrismaClient} from "@prisma/client";
import NotificationService from "../notification/notification";
import {Middleware} from "grammy";

export default class DiscountService {
  constructor(
    private readonly prisma: PrismaClient,
  ) { }

  async createDiscount(planId: number, price: number, duration: number) {
    const currentDate = new Date();
    const expireAt = new Date(currentDate);
    expireAt.setDate(currentDate.getDate() + duration);
    await this.prisma.discount.create({
      data: {
        id: planId,
        price: price,
        expireAt: expireAt
      }
    })
  }

  async deleteDiscount(planId: number) {
    await this.prisma.discount.delete({
      where: { id: planId },
    })
  }

  async checkForTemporaryDiscounts(notification: NotificationService) {
    const currentDate = new Date();
    const discounts = await this.prisma.discount.findMany({
      where: {
        expireAt: {
          lt: currentDate
        }
      },
      include: {
        plan: true
      }
    });
    for (const discount of discounts) {
      const plan = discount.plan;
      const planType = plan.isSingle ? 'Adobe CC все приложения + ИИ' : 'Adobe CC одно приложение';
      const planDescription = `${plan?.durationInMonths} месяцев - ${discount.price} рублей (до скидки ${plan?.price})`;
      await this.deleteDiscount(discount.id);
      await notification.globalMessage(`Скидка\n${planType}\n${planDescription},\nбыла завершена`);
    }
  }

  async checkForPersonalDiscounts(notification: NotificationService) {
    const eightHoursAgo = new Date(new Date().getTime() - 8 * 60 * 60 * 1000);
    const currentDate = new Date();

    const users = await this.prisma.user.findMany(
      {
        where: {
          lastAction: {
            lt: eightHoursAgo
          },
          personalDiscountExpireAt: { lt: currentDate }
        }
      });

    for (const user of users) {
      await this.givePersonalDiscount(user.id);
      await notification.privateMessage(
        user.id,
        'У нас для вас особое предложение! Скидка 10% на продление подписки, действует 4 дня.'
      );
    }

    return users;
  }

  async givePersonalDiscount(userId: string, percent: number = 10) {
    const expireAt = new Date(new Date().getTime() + 4 * 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        personalDiscount: percent,
        personalDiscountExpireAt: expireAt
      }
    });
  }

  async removePersonalDiscount(userId: string) {
    this.prisma.user.update({
      where: { id: userId },
      data: {
        personalDiscount: 0,
        personalDiscountExpireAt: new Date()
      }
    });
  }

  async getPersonalDiscount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return 0;
    if (user.personalDiscountExpireAt < new Date()) return 0;
    return user.personalDiscount;
  }

  middleware(): Middleware {
    return async (ctx, next) => {
      if (!ctx.from?.id) {
        await next();
        return;
      }
      await this.prisma.user.upsert({
        where: { id: `${ctx.from?.id}`},
        create: {
          id: `${ctx.from?.id}`
        },
        update: {
          lastAction: new Date()
        }
      });
      await next();
    }
  }
}