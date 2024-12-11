import { PlanId } from "../aliases";
import User from "../user/User";

export default interface Plan {
  id(): Promise<PlanId>;
  isSingle(): Promise<boolean>;
  getPrice(): Promise<number>;
  hasDiscount(): Promise<boolean>
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
  async isSingle(): Promise<boolean> {
    return false;
  }
  async getPrice(): Promise<number> {
    return 0;
  }
  async hasDiscount(): Promise<boolean> {
    return true;
  }
  async extendSubscrptionFor(_: User): Promise<void> { }
  async asString(): Promise<string> {
    return this.representation
  }
}
