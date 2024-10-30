interface User {
    name(): Promise<TelegramNickname>
    session(): Promise<Session>
    send(): Promise<void>;
}