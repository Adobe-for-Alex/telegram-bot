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
  async extendSubscrptionFor(user: User): Promise<void> {
    const plan = await this.prisma.plan.findFirst({ where: { id: this._id } })
    if (!plan) throw new Error(`Plan ${this._id} not found`)
    const approve = await this.prisma.approve.findFirst({
      select: { requestId: true },
      where: {
        request: { payment: { userId: await user.id() } },
        AND: { request: { payment: { planId: this._id } } }
      }
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
    const plan = await this.prisma.plan.findFirst({ where: { id: this._id } })
    return `${plan?.durationInMonths} месяцев - ${plan?.price} рублей`
  }
}
