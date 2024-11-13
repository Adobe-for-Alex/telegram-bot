import { Api, Middleware } from "grammy";
import Admin from "../admin/Admin";
import Admins from "./Admins";
import { PrismaClient } from "@prisma/client";

export default class AdminsInPrisma implements Admins {
  constructor(
    private readonly api: Api,
    private readonly prisma: PrismaClient
  ) { }
  any(): Promise<Admin> {
    throw new Error("Method not implemented.");
  }
  middleware(): Middleware {
    return (_, next) => next()
  }
}
