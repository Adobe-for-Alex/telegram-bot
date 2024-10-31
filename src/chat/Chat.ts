import File from "../file/File";

export default interface Chat {
  sendText(message: string): Promise<void>;
  sendImage(image: File): Promise<void>; // Изменили тип на File
  sendFile(file: File): Promise<void>;
}