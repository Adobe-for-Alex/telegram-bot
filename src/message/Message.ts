import Chat from "../chat/Chat";

export default interface Message {
  send(context: Chat): Promise<void>;
}
