import { MessageId } from "../aliases";
import Plan from "../plan/Plan";
import User from "../user/User";

export default interface Admin {
  requestCheck(plan: Plan, user: User, message: MessageId, filePath: string): Promise<void>;
}
