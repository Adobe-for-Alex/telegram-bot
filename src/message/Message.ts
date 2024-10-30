import {Context} from "telegraf";

interface Message {
    asString(): Promise<string>
    send(context: Context): Promise<void>;

}

export default Message;