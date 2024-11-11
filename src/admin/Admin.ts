import { MessageId } from "../aliases";
import { Plan } from "../plan/Plan";
import { User } from "../user/User";

export interface Admin {
  requestCheck(plan: Plan, user: User, messageId: MessageId): Promise<void>;
}
