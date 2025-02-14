import createPrismaMock from 'prisma-mock';
import { PrismaClient } from '@prisma/client';
import { Bot } from "grammy";
import NotificationService from "./notification";



class botMock {
    public readonly sentMessages: {userId: string, message: string}[] = [];
    public readonly api = {
        sendMessage: (userId: string, message: string) => {
            this.sentMessages.push({ userId, message });
        }
    }
}

/**
 * Константы, описывающие дни, используемые в качестве даты окончания подписки
 */
const now = Date.now();
const twoDaysAgo = new Date(now - 24 * 60 * 60 * 1000 * 2)
const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
const today = new Date(now);
const oneDayLater = new Date(now + 24 * 60 * 60 * 1000);
const twoDaysLater = new Date(now + 24 * 60 * 60 * 1000 * 2);
const tenDaysLater = new Date(now + 24 * 60 * 60 * 1000 * 10);

const generateSubscription = (userId: string, date: Date) => {
    return {
        userId: userId,
        expiredAt: date,
        createdAt: today,
        approveId: 1,
        expireSent: false,
        expireSoonSent: false
    }
}

const generateUser = (userId: string) => {
    return {
        id: userId,
        createdAt: new Date(),
        personalDiscount: 0,
        personalDiscountExpireAt: new Date(),
        lastAction: new Date(),
    }
}

const userId = '1';

describe('notification', () => {
    it('should send expire soon notification', async () => {
        const bot = new botMock();
        const prisma = createPrismaMock<PrismaClient>({
            user: [generateUser(userId)],
            subscription: [
                generateSubscription(userId, twoDaysAgo),
                generateSubscription(userId, oneDayAgo),
                generateSubscription(userId, today),
                generateSubscription(userId, oneDayLater),
                generateSubscription(userId, twoDaysLater),
            ]
        })

        const notification = new NotificationService(prisma, bot as unknown as Bot);

        await notification.notifyExpireSoon();

        expect(bot.sentMessages).toHaveLength(1);
    });

    it('should send expired notification', async () => {
        const bot = new botMock();
        const prisma = createPrismaMock<PrismaClient>({
            user: [generateUser(userId)],
            subscription: [
                generateSubscription(userId, twoDaysAgo),
                generateSubscription(userId, oneDayAgo),
            ]
        })

        const notification = new NotificationService(prisma, bot as unknown as Bot);

        await notification.notifyExpired();

        expect(bot.sentMessages).toHaveLength(1);
    });

    it('should not send expire soon notification', async () => {
        const bot = new botMock();
        const prisma = createPrismaMock<PrismaClient>({
            user: [generateUser(userId)],
            subscription: [
                generateSubscription(userId, twoDaysAgo),
                generateSubscription(userId, oneDayAgo),
                generateSubscription(userId, today),
                generateSubscription(userId, oneDayLater),
                generateSubscription(userId, twoDaysLater),
                generateSubscription(userId, tenDaysLater),
            ]
        })

        const notification = new NotificationService(prisma, bot as unknown as Bot);

        await notification.notifyExpireSoon();

        expect(bot.sentMessages).toHaveLength(0);
    });

    it('should not send expired notification', async () => {
        const bot = new botMock();
        const prisma = createPrismaMock<PrismaClient>({
            user: [generateUser(userId)],
            subscription: [
                generateSubscription(userId, twoDaysAgo),
                generateSubscription(userId, oneDayAgo),
                generateSubscription(userId, oneDayLater),
            ]
        })

        const notification = new NotificationService(prisma, bot as unknown as Bot);

        await notification.notifyExpired();

        expect(bot.sentMessages).toHaveLength(0);
    });

    it('should send only 1 expire soon notification', async () => {
        const bot = new botMock();
        const prisma = createPrismaMock<PrismaClient>({
            user: [generateUser(userId)],
            subscription: [
                generateSubscription(userId, twoDaysAgo),
                generateSubscription(userId, oneDayAgo),
                generateSubscription(userId, today),
                generateSubscription(userId, oneDayLater),
                generateSubscription(userId, twoDaysLater),
            ]
        })

        const notification = new NotificationService(prisma, bot as unknown as Bot);

        await notification.notifyExpireSoon();
        await notification.notifyExpireSoon();
        await notification.notifyExpireSoon();

        expect(bot.sentMessages).toHaveLength(1);
    });

    it('should send only 1 expired notification', async () => {
        const bot = new botMock();
        const prisma = createPrismaMock<PrismaClient>({
            user: [generateUser(userId)],
            subscription: [
                generateSubscription(userId, twoDaysAgo),
                generateSubscription(userId, oneDayAgo),
            ]
        })

        const notification = new NotificationService(prisma, bot as unknown as Bot);

        await notification.notifyExpired();
        await notification.notifyExpired();
        await notification.notifyExpired();

        expect(bot.sentMessages).toHaveLength(1);
    });
});