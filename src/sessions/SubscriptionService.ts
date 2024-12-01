import { PrismaClient } from "@prisma/client";
import { SessionId, UserId } from "../aliases";
import Session from "../session/Session";
import Sessions from "./Sessions";
import SessionInService from "../session/SessionInService";

export default class SubscriptionService implements Sessions {
  constructor(
    private readonly baseUrl: URL,
    private readonly prisma: PrismaClient
  ) { }
  async withId(id: SessionId): Promise<Session | undefined> {
    const session = await this.prisma.session.findFirst({
      select: { id: true },
      where: { id: id }
    })
    if (!session) return undefined
    return new SessionInService(id, this.baseUrl, this.prisma)
  }
  async forUser(id: UserId): Promise<Session> {
    const session = await this.prisma.session.findFirst({
      select: { id: true },
      where: { userId: id, deleted: false },
      orderBy: { createdAt: 'desc' }
    })
    if (session) return new SessionInService(session.id, this.baseUrl, this.prisma)
    const user = await this.prisma.user.findFirst({
      select: { id: true },
      where: { id: id }
    })
    if (!user) throw new Error(`User with id ${id} not exists while restoring session for him`)

    console.log('Create session URL:', new URL('/sessions', this.baseUrl))
    const response = await fetch(new URL('/sessions', this.baseUrl), { method: 'POST' })
    console.log('Create session:', response.status, response.statusText, await response.clone().text())
    const { id: sessionId, email, password } = await response.json()

    const newSession = await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: id,
        email,
        password
      }
    })
    return new SessionInService(newSession.id, this.baseUrl, this.prisma)
  }
  async update(id: SessionId, email: string, password: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { email, password }
    })
  }
}
