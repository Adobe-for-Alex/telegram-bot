import { SubscrptionId } from "../aliases";

export interface Subscrption {
  id(): Promise<SubscrptionId>;
  ended(): Promise<Date>;
  asString(): Promise<string>;
}
