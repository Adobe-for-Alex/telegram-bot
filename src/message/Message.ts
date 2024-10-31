export default interface Message {
  send(context: Chat): Promise<void>;
}

export interface Chat {
  sendText(message: string): Promise<void>;
  sendImage(imageUrl: string): Promise<void>;
  sendFile(fileUrl: string): Promise<void>;
}