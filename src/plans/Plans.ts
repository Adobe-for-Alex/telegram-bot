import { PlanId } from "../aliases";
import Plan from "../plan/Plan";

export default interface Plans {
  all(): Promise<Plan[]>;
  withId(id: PlanId): Promise<Plan | undefined>;
}

export class FakePlans implements Plans {
  constructor(
    private readonly plans: Record<PlanId, Plan>
  ) { }
  async all(): Promise<Plan[]> {
    return Object.keys(this.plans).sort().map(x => this.plans[+x]).filter(x => x !== undefined)
  }
  async withId(id: PlanId): Promise<Plan | undefined> {
    return this.plans[id]
  }
}
