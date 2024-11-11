import { PlanId } from "../aliases";
import { Plan } from "../plan/Plan";

export interface Plans {
  all(): Promise<Plan[]>;
  withId(id: PlanId): Promise<Plan | undefined>;
}
