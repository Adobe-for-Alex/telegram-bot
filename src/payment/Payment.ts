interface Payment {
    asMessage(): Promise<Message>
    extend(session: Session): Promise<void>;
}