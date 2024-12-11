import { PrismaClient } from "@prisma/client";
import { UserId } from "../aliases";
import Subscrption from "../subscription/Subscrption";
import User from "./User";

export default class UserInPrisma implements User {
  constructor(
    private readonly _id: UserId,
    private readonly prisma: PrismaClient
  ) { }
  async id(): Promise<UserId> {
    return this._id
  }
  async isAdmin(): Promise<boolean> {
    const user = this.prisma.user.findUnique({
      where: { id: this._id, },
      select: { admin: true }
    });

    return await user?.admin() !== null;
  }
  async subscrption(): Promise<Subscrption | undefined> {
    const subscrption = await this.prisma.subscription.findFirst({
      where: { userId: this._id },
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
