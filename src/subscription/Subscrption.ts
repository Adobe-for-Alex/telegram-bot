import { SubscrptionId } from "../aliases";

export default interface Subscrption {
  id(): Promise<SubscrptionId>;
  ended(): Promise<Date>;
  asString(): Promise<string>;
}
