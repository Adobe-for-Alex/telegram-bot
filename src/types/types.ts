type TelegramId = string;
type ChatId = string;

interface Session {
    id: string;
    email: string;
    password: string;
    expiresAt: Date;
}

interface Subscription {
    id: string;
    durationMonths: number;
    status: 'active' | 'expired' | 'pending';
    startDate: Date;
    endDate: Date;
}


interface Users {
    register(id: TelegramId, chat: ChatId): Promise<User>;

    withId(id: TelegramId): Promise<User | undefined>;
}

interface User {
    id(): Promise<TelegramId>;

    session(): Promise<Session>;

    subscription(): Promise<Subscription | undefined>;
}

interface Service {
    users(): Promise<Users>;

    updateSession(sessionId: string, email: string, password: string): Promise<void>;
}

interface SubscriptionService {
    createSubscription(userId: TelegramId, durationMonths: number): Promise<Subscription>;

    updateSubscriptionStatus(subscriptionId: string, status: 'active' | 'expired' | 'pending'): Promise<void>;

    getSubscription(userId: TelegramId): Promise<Subscription | undefined>;
}

interface AdminService {
    verifyPayment(userId: TelegramId, paymentProof: string): Promise<'approved' | 'rejected'>;

    notifyAdmin(userId: TelegramId, reason: string): Promise<void>;
}
