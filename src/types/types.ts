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
}

interface Payment {
    user(): Promise<User>

    receipt(): Promise<File>

    asMessage(): Promise<TelegramMessage>
}

interface Service {
    users(): Promise<Users>;

    updateSession(sessionId: string, email: string, password: string): Promise<void>;
}


interface Admin {
    requestPaymentVerification(payment: Payment): Promise<'approved' | 'rejected'>
}

interface Admins {
    anyNotBusy(): Promise<Admin>
}
