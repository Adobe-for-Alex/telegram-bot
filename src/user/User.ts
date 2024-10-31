import Message from "../message/Message";
import Session from "../session/Session";

export default interface User {
  name(): Promise<TelegramNickname>
  session(): Promise<Session>
  send(message: Message): Promise<void>;
  answer(): Promise<Message>
}