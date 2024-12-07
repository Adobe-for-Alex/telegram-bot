import { PrismaClient } from "@prisma/client";
import { PlanId } from "../aliases";
import Plan from "../plan/Plan";
import Plans from "./Plans";
import PlanInPrisma from "../plan/PlanInPrisma";

export default class PlansInPrisma implements Plans {
  constructor(
    private readonly prisma: PrismaClient
  ) { }
  async all(): Promise<Plan[]> {
    return (await this.prisma.plan.findMany({
      select: { id: true },
      where: { secret: false },
      orderBy: { id: 'asc' }
    })).map(x => new PlanInPrisma(x.id, this.prisma))
  }
  async withId(id: PlanId): Promise<Plan | undefined> {
    const plan = await this.prisma.plan.findFirst({
      select: { id: true },
      where: { id: id }
    })
    if (!plan) return undefined
    return new PlanInPrisma(id, this.prisma)
  }
}
