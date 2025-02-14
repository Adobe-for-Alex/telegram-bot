import { Bot } from "grammy";
import { PrismaClient } from "@prisma/client";

export default class NotificationService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly bot: Bot
    ) { }

    async globalMessage(message: string): Promise<void> {
        const users = await this.prisma.user.findMany({});
        for (const user of users) {
            await this.bot.api.sendMessage(user.id, message);
        }
    }

    async privateMessage(userId: string, message: string): Promise<void> {
        await this.bot.api.sendMessage(userId, message);
    }

    async notifyAdmins(message: string): Promise<void> {
        const admins = await this.prisma.admin.findMany({});

        for (const admin of admins) {
            await this.bot.api.sendMessage(admin.userId, message);
        }
    }

    async notifyExpireSoon(): Promise<void> {
        const currentDate = new Date();
        const fiveDaysLater = new Date();
        fiveDaysLater.setDate(currentDate.getDate() + 5);

        const users = await this.prisma.user.findMany({
            include: {
                subscriptions: {
                    orderBy: {
                        expiredAt: 'desc'
                    },
                    take: 1
                }
            }
        });

        const subscriptions = users.map((user) => user.subscriptions[0]);

        for (const subscription of subscriptions) {
            if (!subscription || subscription.expiredAt >= fiveDaysLater || subscription.expiredAt <= currentDate || subscription.expireSoonSent) continue;
            await this.bot.api.sendMessage(
              subscription.userId,
              'Ваша подписка истекает через 5 дней. Вы можете продлить её прямо сейчас, чтобы не потерять доступ к продуктам Adobe\n'
            );
            await this.prisma.subscription.update({
                where: { approveId: subscription.approveId },
                data: { expireSoonSent: true }
            });
        }
    }

    async notifyExpired(): Promise<void> {
        const currentDate = new Date();

        const users = await this.prisma.user.findMany({
            include: {
                subscriptions: {
                    orderBy: {
                        expiredAt: 'desc'
                    },
                    take: 1
                }
            }
        });

        const subscriptions = users.map((user) => user.subscriptions[0]);

        for (const subscription of subscriptions) {
            console.log(subscription);
            if (!subscription || subscription.expiredAt > currentDate || subscription.expireSent) continue;
            await this.bot.api.sendMessage(
                subscription.userId,
                'Ваша подписка закончилась. Не теряйте доступ к Adobe! Продлите её прямо сейчас.'
            );
            await this.prisma.subscription.update({
                where: { approveId: subscription.approveId },
                data: { expireSent: true }
            })
        }
    }
}
