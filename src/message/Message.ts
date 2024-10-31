import Chat from "../chat/Chat";

export default interface Message {
  sendTo(context: Chat): Promise<void>
}
