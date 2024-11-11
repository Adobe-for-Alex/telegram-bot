import { UserId } from "../aliases";
import { User } from "../user/User";

export interface Users {
  withId(id: UserId): Promise<User>;
}
