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

    async notifyExpireSoon(): Promise<void> {
        const currentDate = new Date();
        const fiveDaysLater = new Date();
        fiveDaysLater.setDate(currentDate.getDate() + 5);

        const expiringSubscriptions = await this.prisma.subscription.findMany({
            where: {
                expiredAt: {
                    gte: currentDate,
                    lte: fiveDaysLater
                },
                expireSoonSent: false
            },
            include: {
                user: true,
            },
        });

        for (const subscription of expiringSubscriptions) {
            await this.bot.api.sendMessage(
              subscription.user.id,
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

        const endedSubscriptions = await this.prisma.subscription.findMany({
            where: {
                expiredAt: {
                    lte: currentDate
                },
                expireSent: false
            },
            include: {
                user: true,
            },
        });

        for (const subscription of endedSubscriptions) {
            await this.bot.api.sendMessage(
                subscription.user.id,
                'Ваша подписка закончилась. Не теряйте доступ к Adobe! Продлите её прямо сейчас.'
            );
            await this.prisma.subscription.update({
                where: { approveId: subscription.approveId },
                data: { expireSent: true }
            })
        }
    }
}
