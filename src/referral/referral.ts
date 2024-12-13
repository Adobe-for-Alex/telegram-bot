import {PrismaClient} from "@prisma/client";

export default class ReferralService {
  constructor(
    private readonly prisma: PrismaClient,
  ) { }

  async createReferral(referralCode: string, referralId: string): Promise<boolean> {
    const referral = await this.prisma.user.findUnique({ where: { id: referralId } });
    if (!referral) return false;
    if (referral.referrerId) return false;
    const referrer = await this.prisma.user.findUnique({ where: { id:referralCode } });
    if (!referrer) return false;
    await this.prisma.user.update({
      where: { id: referralId },
      data: { referrerId: referralCode }
    });
    return true;
  }

  getReferralCode(botLink: string, userId: string) {
    return `https://${botLink}?start=${userId}`;
  }

  async getReferralsCount(referrerId: string) {
    return this.prisma.user.count({ where: { referrerId: referrerId } });
  }

  async getDiscountPercent(referrerId: string) {
    return this.getReferralsCount(referrerId);
  }
}