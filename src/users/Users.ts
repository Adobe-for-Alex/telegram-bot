import User from "../user/User";

export default interface Users {
  register(id: TelegramId, chat: ChatId): Promise<User>;
  withId(id: TelegramId): Promise<User>;
}