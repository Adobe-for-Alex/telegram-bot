import User from "../user/User";

interface Users {
  register(id: TelegramId, chat: ChatId): Promise<User>;
  withId(id: TelegramId): Promise<User>;
}

export default Users;