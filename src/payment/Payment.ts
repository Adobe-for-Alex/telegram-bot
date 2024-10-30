import Message from "../message/Message";
import Session from "../session/Session";

export default interface Payment {
  asMessage(): Promise<Message>
  extend(session: Session): Promise<void>;
}

