import Message from "../message/Message";

interface User {
  message: Message
  name(): Promise<TelegramNickname>
  session(): Promise<Session>
  send(): Promise<void>;
  answer(): Promise<Message>
}

export default User;