import User from "../user/User";
import {ChatId, TelegramId} from "../aliases";

export default interface Users {
  register(id: TelegramId, chat: ChatId): Promise<User>;
  withId(id: TelegramId): Promise<User | undefined>;
}