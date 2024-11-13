import { PrismaClient } from "@prisma/client";
import { UserId } from "../aliases";
import User from "../user/User";
import Users from "./Users";

export default class UsersInPrisma implements Users {
  constructor(
    private readonly prisma: PrismaClient,
  ) { }
  async withId(id: UserId): Promise<User> {
    await this.prisma.user.findFirst({
      select: { id: true },
      where: { id: id }
    }) || await this.prisma.user.create({
      data: {
        id: id
      }
    })
    return {
      id: async () => id,
      subscrption: async () => {
        const subscrption = await this.prisma.subscription.findFirst({
          where: { userId: id },
          orderBy: { expiredAt: 'desc' },
          include: { user: { include: { sessions: { where: { deleted: false }, take: 1 } } } }
        })
        if (!subscrption) return undefined
        return {
          id: async () => subscrption.approveId,
          ended: async () => subscrption.expiredAt,
          asString: async () => `E-mail: ${subscrption.user.sessions[0]?.email}
Пароль: ${subscrption.user.sessions[0]?.password}
Истекает: ${subscrption.expiredAt}`
        }
      }
    }
  }
}
