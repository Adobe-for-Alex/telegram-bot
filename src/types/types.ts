type TelegramId = string;
type ChatId = string;
type TelegramNickname = string;
type TelegramMessage = string;

interface Session {
    id(): Promise<string>;
    email(): Promise<string>;
    password(): Promise<string>;
    endDate(): Promise<Date>;
}

interface Users {
    register(id: TelegramId, chat: ChatId): Promise<User>;

    withId(id: TelegramId): Promise<User | undefined>;
}

interface User {
    name(): Promise<TelegramNickname>

    subscription(): Promise<Session | undefined>;

    send(): Promise<void>;
}

interface Message {
    asString(): Promise<string>;
}


interface Price {
   discount(): Promise<number>;

   amount(): Promise<number>;

   discountedAmount(): Promise<number>;
}

interface Payment {
    user(): Promise<User>

    receipt(): Promise<File>

    asMessage(): Promise<Message>

    price(): Promise<Price>;
}

interface Service {
    users(): Promise<Users>;

    updateSession(sessionId: string, email: string, password: string): Promise<void>;

    createSession(userId: TelegramId, duration: number): Promise<Session>; 
}


interface Admin {
    requestPaymentVerification(payment: Payment): Promise<'approved' | 'rejected'>
}

interface Admins {
    anyNotBusy(): Promise<Admin>
}
