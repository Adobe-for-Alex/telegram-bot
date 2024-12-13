import {PrismaClient} from "@prisma/client";

export default class SettingService {
  constructor(
    private readonly prisma: PrismaClient
  ) {}

  async getSetting(key: string): Promise<boolean> {
    const text = await this.prisma.setting.findUnique({ where: { key: key } });
    if (!text) return false;
    if (typeof text.value === "boolean") {
      return text.value;
    }
    return false;
  }

  async setSetting(key: string, value: boolean) {
    await this.prisma.setting.upsert({
      where: { key: key },
      create: { key: key, value: value },
      update: { value: value }
    })
  }

  async getReferrals() {
    return await this.getSetting('referrals');
  }

  async getTypes() {
    return await this.getSetting('types');
  }

  async getAskFrom() {
    return await this.getSetting('ask-from');
  }
}