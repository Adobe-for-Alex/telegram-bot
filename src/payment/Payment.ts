import Message from "../message/Message";
import Session from "../session/Session";

export default interface Payment {
  extend(session: Session): Promise<void>
  asMessage(): Promise<Message>
}