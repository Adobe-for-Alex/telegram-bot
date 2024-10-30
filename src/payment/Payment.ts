import Message from "../message/Message";

interface Payment {
  asMessage(): Promise<Message>
  extend(session: Session): Promise<void>;
}

export default Payment;