import { PrismaClient } from "@prisma/client";
import { SessionId, UserId } from "../aliases";
import Session from "../session/Session";
import Sessions from "./Sessions";

export default class SubscriptionService implements Sessions {
  constructor(
    private readonly baseUrl: URL,
    private readonly prisma: PrismaClient
  ) { }
  withId(id: SessionId): Promise<Session> {
    throw new Error("Method not implemented.");
  }
  forUser(id: UserId): Promise<Session | undefined> {
    throw new Error("Method not implemented.");
  }
}
