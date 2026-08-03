import { db } from "@/lib/db/prisma";
import { CampaignTracker } from "./CampaignTracker";

async function getCampaigns() {
  return db.marketingCampaign.findMany({
    orderBy: [{ isActive: "desc" }, { startedAt: "desc" }],
  });
}

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaign Tracker</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track paid and organic marketing campaigns. Manual input is fine for
          MVP.
        </p>
      </div>
      <CampaignTracker initialCampaigns={campaigns} />
    </div>
  );
}
