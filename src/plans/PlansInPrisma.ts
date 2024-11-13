import { PrismaClient } from "@prisma/client";
import { PlanId } from "../aliases";
import Plan from "../plan/Plan";
import Plans from "./Plans";

export default class PlansInPrisma implements Plans {
  constructor(
    private readonly prisma: PrismaClient
  ) { }
  all(): Promise<Plan[]> {
    throw new Error("Method not implemented.");
  }
  withId(id: PlanId): Promise<Plan | undefined> {
    throw new Error("Method not implemented.");
  }
}
