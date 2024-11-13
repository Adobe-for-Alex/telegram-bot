import { PrismaClient } from "@prisma/client";
import { UserId } from "../aliases";
import User from "../user/User";
import Users from "./Users";
import Sessions from "../sessions/Sessions";

export default class UsersInPrisma implements Users {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly sessions: Sessions
  ) { }
  withId(id: UserId): Promise<User> {
    throw new Error("Method not implemented.");
  }
}
