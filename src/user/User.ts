import Message from "../message/Message";
import Session from "../session/Session";

export default interface User {
  message: Message
  name(): Promise<TelegramNickname>
  session(): Promise<Session>
  send(): Promise<void>;
  answer(): Promise<Message>
}

