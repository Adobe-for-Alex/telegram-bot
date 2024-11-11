import { PlanId } from "../aliases";
import { User } from "../user/User";

export interface Plan {
  id(): Promise<PlanId>;
  extendSubscrptionFor(user: User): Promise<void>;
  asString(): Promise<string>;
}

export class FakePlan implements Plan {
  constructor(
    private readonly _id: PlanId,
    private readonly representation: string
  ) { }
  async id(): Promise<PlanId> {
    return this._id
  }
  async extendSubscrptionFor(_: User): Promise<void> { }
  async asString(): Promise<string> {
    return this.representation
  }
}
