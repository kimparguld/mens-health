import { db } from "@/lib/db/prisma";
import { OutreachTable } from "./OutreachTable";

async function getContacts() {
  return db.outreachContact.findMany({
    orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
  });
}

export default async function OutreachPage() {
  const contacts = await getContacts();

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach CRM</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track creator outreach, backlink opportunities, and sponsor
            conversations.
          </p>
        </div>
      </div>

      <OutreachTable initialContacts={contacts} />
    </div>
  );
}
