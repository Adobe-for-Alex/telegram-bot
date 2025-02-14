import createPrismaMock from 'prisma-mock';
import { PrismaClient } from '@prisma/client';
import { Bot } from "grammy";
import NotificationService from "./notification";
import {loadConfig} from "../config";

const now = Date.now(); //Текущий день
const config = loadConfig();
const userId = ''; //Вставить свой userId

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
            expiredAt: new Date(now - 24 * 60 * 60 * 1000 * 2), // Позавчера
            createdAt: new Date(),
            approveId: 1,
            expireSent: false,
            expireSoonSent: false
        },
        {
            userId: userId,
            expiredAt: new Date(now - 24 * 60 * 60 * 1000), // Вчера
            createdAt: new Date(),
            approveId: 2,
            expireSent: false,
            expireSoonSent: false
        },
        {
            userId: userId,
            expiredAt: new Date(now), // Сегодня
            createdAt: new Date(),
            approveId: 3,
            expireSent: false,
            expireSoonSent: false
        },
        {
            userId: userId,
            expiredAt: new Date(now + 24 * 60 * 60 * 1000), // Завтра
            createdAt: new Date(),
            approveId: 4,
            expireSent: false,
            expireSoonSent: false
        },
        {
            userId: userId,
            expiredAt: new Date(now + 24 * 60 * 60 * 1000 * 2), // Послезавтра
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

        const bot = new Bot(config.token);

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
    }, 10000);
    it('should set notified only for last subscription', async () => {

        const bot = new Bot(config.token);

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
                //Если последняя
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