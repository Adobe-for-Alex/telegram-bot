import {PrismaClient} from "@prisma/client";

export default class ReferralService {
  constructor(
    private readonly prisma: PrismaClient,
  ) { }

  async createReferral(referralCode: string, referralId: string) {
    const referral = await this.prisma.user.findUnique({ where: { id: referralId } });
    if (referral) return;
    const referrer = await this.prisma.user.findUnique({ where: { id:referralCode } });
    if (!referrer) return;
    await this.prisma.user.create({data: { id: referralId, referrerId: referralCode }});
  }

  getReferralCode(userId: string) {
    return `https://t.me/kostanchik_bot?start=${userId}`;
  }

  async getReferralsCount(referrerId: string) {
    return this.prisma.user.count({ where: { referrerId: referrerId } });
  }

  async getDiscountPercent(referrerId: string) {
    return this.getReferralsCount(referrerId);
  }
}