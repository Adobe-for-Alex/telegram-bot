interface Session {
    email(): Promise<string>;
    password(): Promise<string>;
    expired(): Promise<Date>;
}
