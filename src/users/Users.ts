import { UserId } from "../aliases";
import User from "../user/User";

export default interface Users {
  withId(id: UserId): Promise<User>;
}

export class FakeUsers implements Users {
  async withId(id: UserId): Promise<User> {
    return {
      id: async () => id,
      isAdmin: async () => false,
      subscrption: async () => undefined
    }
  }
}
