import { PrismaClient } from "@prisma/client";
import Session from "./Session";
import { SessionId } from "../aliases";
import UserInPrisma from "../user/UserInPrisma";
import User from "../user/User";

export default class SessionInService implements Session {
  constructor(
    private readonly id: SessionId,
    private readonly baseUrl: URL,
    private readonly prisma: PrismaClient
  ) { }
  async user(): Promise<User> {
    const session = await this.prisma.session.findFirst({
      select: { userId: true },
      where: { id: this.id }
    })
    if (!session) throw new Error(`Session ${this.id} not found`)
    return new UserInPrisma(session.userId, this.prisma)
  }
  async delete(): Promise<void> {
    await fetch(`${this.baseUrl}/sessions/${this.id}`, { method: 'DELETE' })
    await this.prisma.session.update({ where: { id: this.id }, data: { deleted: true } })
  }
} 
