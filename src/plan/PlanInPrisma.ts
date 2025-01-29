import { PrismaClient } from "@prisma/client";
import { PlanId } from "../aliases";
import User from "../user/User";
import Plan from "./Plan";

export default class PlanInPrisma implements Plan {
  constructor(
    private readonly _id: PlanId,
    private readonly prisma: PrismaClient
  ) { }
  async id(): Promise<PlanId> {
    return this._id
  }
  async isSingle(): Promise<boolean> {
    const plan = await this.prisma.plan.findFirst({ where: { id: this._id } })
    if (!plan) return false;
    return plan.isSingle;
  }
  async getPrice(): Promise<number> {
    const discount = await this.prisma.discount.findFirst({ where: { id: this._id } })
    if (discount) return discount.price;
    const plan = await this.prisma.plan.findFirst({ where: { id: this._id } });
    if (!plan) return 0;
    return plan.price;
  }
  async hasDiscount(): Promise<boolean> {
    const discount = await this.prisma.discount.findFirst({ where: { id: this._id } })
    return discount !== null;
  }
  async extendSubscrptionFor(user: User): Promise<void> {
    const plan = await this.prisma.plan.findFirst({ where: { id: this._id } })
    if (!plan) throw new Error(`Plan ${this._id} not found`)
    const approve = await this.prisma.approve.findFirst({
      select: { requestId: true },
      where: {
        request: { payment: { userId: await user.id() } },
        AND: { request: { payment: { planId: this._id } } }
      },
      orderBy: { createdAt: 'desc' }
    })
    if (!approve) throw new Error(`Approve for user ${await user.id()} and plan ${this._id} not found`)
    const startDate = await user.subscrption().then(x => x?.ended()) || new Date()
    const expiredDate = new Date(startDate)
    expiredDate.setMonth(expiredDate.getMonth() + plan?.durationInMonths)
    await this.prisma.subscription.create({
      data: {
        approveId: approve.requestId,
        userId: await user.id(),
        expiredAt: expiredDate
      }
    })
  }
  async asString(): Promise<string> {
    const discount = await this.prisma.discount.findFirst({ where: { id: this._id } })
    const plan = await this.prisma.plan.findFirst({ where: { id: this._id } })
    if (discount !== null) {
      return `${plan?.durationInMonths} месяцев - ${discount.price} рублей (до скидки ${plan?.price})`
    }
    return `${plan?.durationInMonths} месяцев - ${plan?.price} рублей `
  }
}
