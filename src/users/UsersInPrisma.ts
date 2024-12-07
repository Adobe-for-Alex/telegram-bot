import { PrismaClient } from "@prisma/client";
import { UserId } from "../aliases";
import User from "../user/User";
import Users from "./Users";
import UserInPrisma from "../user/UserInPrisma";

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
    return new UserInPrisma(id, this.prisma)
  }
}
