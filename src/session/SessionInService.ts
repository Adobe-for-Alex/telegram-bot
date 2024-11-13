import { PrismaClient } from "@prisma/client";
import Session from "./Session";
import { SessionId } from "../aliases";

export default class SessionInService implements Session {
  constructor(
    private readonly id: SessionId,
    private readonly baseUrl: URL,
    private readonly prisma: PrismaClient
  ) { }
  async delete(): Promise<void> {
    await fetch(`${this.baseUrl}/sessions/${this.id}`, { method: 'DELETE' })
    await this.prisma.session.update({ where: { id: this.id }, data: { deleted: true } })
  }
} 
