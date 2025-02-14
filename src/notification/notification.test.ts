import createPrismaMock from 'prisma-mock';
import { PrismaClient } from '@prisma/client';
import { Bot } from "grammy";
import NotificationService from "./notification";

/**
 * Константы, описывающие дни, используемые в качестве даты окончания подписки
 */
const now = Date.now();
const twoDaysAgo = new Date(now - 24 * 60 * 60 * 1000 * 2)
const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
const oneDaysLater = new Date(now + 24 * 60 * 60 * 1000);
const twoDaysLater = new Date(now + 24 * 60 * 60 * 1000 * 2);

const userId = '1';

const userWithSubscriptionsPrisma = createPrismaMock<PrismaClient>({
    user: [{
        id: userId,
        createdAt: new Date(),
        personalDiscount: 0,
        personalDiscountExpireAt: new Date(),
        lastAction: new Date(),
    }],
    subscription: [
        {
            userId: userId,
            expiredAt: twoDaysAgo,
            createdAt: new Date(),
            approveId: 1,
            expireSent: false,
            expireSoonSent: false
        },
        {
            userId: userId,
            expiredAt: oneDayAgo,
            createdAt: new Date(),
            approveId: 2,
            expireSent: false,
            expireSoonSent: false
        },
        {
            userId: userId,
            expiredAt: new Date(now),
            createdAt: new Date(),
            approveId: 3,
            expireSent: false,
            expireSoonSent: false
        },
        {
            userId: userId,
            expiredAt: oneDaysLater,
            createdAt: new Date(),
            approveId: 4,
            expireSent: false,
            expireSoonSent: false
        },
        {
            userId: userId,
            expiredAt: twoDaysLater,
            createdAt: new Date(),
            approveId: 5,
            expireSent: false,
            expireSoonSent: false
        },
    ]
});

const userWithoutSubscriptionsPrisma = createPrismaMock<PrismaClient>({
    user: [{
        id: userId,
        createdAt: new Date(),
        personalDiscount: 0,
        personalDiscountExpireAt: new Date(),
        lastAction: new Date(),
    }]
});

describe('User Subscriptions', () => {
    it('should return the latest subscription for each user', async () => {
        const botMock = {
            api: {
                sendMessage: jest.fn()
            }
        };
        const bot = botMock as unknown as Bot;

        const notification = new NotificationService(userWithSubscriptionsPrisma, bot);

        await notification.notifyExpireSoon();
        await notification.notifyExpireSoon();
        await notification.notifyExpireSoon();
        await notification.notifyExpired();
        await notification.notifyExpired();
        await notification.notifyExpired();

        const users = await userWithSubscriptionsPrisma.user.findMany({
            include: {
                subscriptions: {
                    orderBy: {
                        expiredAt: 'desc'
                    },
                    take: 1
                }
            }
        });

        const subscriptions = users.map((user: { subscriptions: any[]; }) => user.subscriptions[0]);

        // Проверка результата
        expect(subscriptions).toHaveLength(1);
        expect(subscriptions[0]?.expiredAt).toEqual(new Date(now + 24 * 60 * 60 * 1000 * 2)); // Должен вернуть последнюю из подписок
        expect(subscriptions[0]?.expireSoonSent).toEqual(true); // Должен вернуть последнюю из подписок
        expect(subscriptions[0]?.expireSent).toEqual(false); // Должен вернуть последнюю из подписок

        // Проверка, что методы Telegram Bot вызывались
        expect(botMock.api.sendMessage).toHaveBeenCalled();
    }, 10000);

    it('should set notified only for last subscription', async () => {
        const botMock = {
            api: {
                sendMessage: jest.fn()
            }
        };
        const bot = botMock as unknown as Bot;

        const notification = new NotificationService(userWithSubscriptionsPrisma, bot);

        await notification.notifyExpireSoon();
        await notification.notifyExpireSoon();
        await notification.notifyExpireSoon();
        await notification.notifyExpired();
        await notification.notifyExpired();
        await notification.notifyExpired();

        const allSubscriptions = await userWithSubscriptionsPrisma.subscription.findMany();

        for (const subscription of allSubscriptions) {
            if (allSubscriptions.indexOf(subscription) === allSubscriptions.length - 1) {
                // Если последняя подписка
                expect(subscription.expireSoonSent).toEqual(true);
                expect(subscription.expireSent).toEqual(false);
            } else {
                expect(subscription.expireSoonSent).toEqual(false);
                expect(subscription.expireSent).toEqual(false);
            }
        }
    }, 10000);

    it('should return undefined', async () => {
        const users = await userWithoutSubscriptionsPrisma.user.findMany({
            include: {
                subscriptions: {
                    orderBy: {
                        expiredAt: 'desc'
                    },
                    take: 1
                }
            }
        });

        const subscriptions = users.map((user: { subscriptions: any[]; }) => user.subscriptions[0]);

        expect(subscriptions).toHaveLength(1);
        expect(subscriptions[0]).toEqual(undefined);
    });
});
