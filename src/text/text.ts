import { PrismaClient } from "@prisma/client";

export default class TextService {
  constructor(
    private readonly prisma: PrismaClient,
  ) {}
  async getField(key: string): Promise<string> {
    const text = await this.prisma.text.findUnique({ where: { key: key } });
    if (!text) return ' ';
    return text.value;
  }

  async setField(key: string, value: string) {
    await this.prisma.text.upsert({
      where: { key: key },
      create: { key: key, value: value },
      update: { value: value }
    })
  }

  async getSupport() {
    return await this.getField('support');
  }

  async getDropShipping() {
    return await this.getField('dropShipping');
  }

  async getInstruction() {
    return await this.getField('instruction');
  }

  async getLink() {
    return await this.getField('link');
  }

  async getGroupLink() {
    return await this.getField('groupLink');
  }
}