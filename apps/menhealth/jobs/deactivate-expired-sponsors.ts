import { db } from "@/lib/db/prisma";

export async function deactivateExpiredSponsors(): Promise<{
  deactivated: number;
}> {
  const result = await db.sponsor.updateMany({
    where: {
      isActive: true,
      endDate: { lt: new Date() },
    },
    data: { isActive: false },
  });
  return { deactivated: result.count };
}
