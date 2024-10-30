import {Context} from "telegraf";

export default interface Message {
  asString(): Promise<string>
  send(context: Context): Promise<void>;

}

