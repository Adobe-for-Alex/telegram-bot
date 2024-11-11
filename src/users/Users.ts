import { UserId } from "../aliases";
import User from "../user/User";

export default interface Users {
  withId(id: UserId): Promise<User>;
}
