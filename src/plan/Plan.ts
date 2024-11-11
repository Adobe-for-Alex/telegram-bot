import { PlanId } from "../aliases";
import { User } from "../user/User";

export interface Plan {
  id(): Promise<PlanId>;
  extendSubscrptionFor(user: User): Promise<void>;
  asString(): Promise<string>;
}
