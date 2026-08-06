import type { GrowthTask } from '@/components/growth-plan/GrowthPlanBoard';
import { GrowthPlanBoard } from '@/components/growth-plan/GrowthPlanBoard';
import { db } from '@/lib/db/prisma';
import Link from 'next/link';

async function getData() {
  const [tasks, startDateSetting] = await Promise.all([
    db.growthPlanTask.findMany({
      orderBy: [{ phase: 'asc' }, { sortOrder: 'asc' }],
    }),
    db.setting.findUnique({ where: { key: 'growthPlanStartDate' } }),
  ]);
  return { tasks, startDate: startDateSetting?.value ?? null };
}

export default async function GrowthPlanPage() {
  const { tasks, startDate } = await getData();

  // Prisma dates need to be serialised before passing to Client Components
  const serialisedTasks: GrowthTask[] = tasks.map((t) => ({
    id: t.id,
    uniqueKey: t.uniqueKey,
    phase: t.phase,
    sortOrder: t.sortOrder,
    dayStart: t.dayStart,
    dayEnd: t.dayEnd,
    title: t.title,
    description: t.description,
    adminPath: t.adminPath,
    priority: t.priority,
    status: t.status,
    notes: t.notes,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
  }));

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            90-Day Growth Plan
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your 90-day traffic foundation. Each phase builds on the last.
          </p>
        </div>
        <div className="text-muted flex gap-3 text-sm">
          <Link href="/admin/content-calendar" className="hover:underline">
            Calendar
          </Link>
          <Link href="/admin/outreach" className="hover:underline">
            Outreach
          </Link>
          <Link href="/admin/marketing/campaigns" className="hover:underline">
            Campaigns
          </Link>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-900">No tasks found.</p>
          <p className="mt-1 text-sm text-amber-700">
            Run{' '}
            <code className="rounded bg-amber-100 px-1 font-mono">
              pnpm seed
            </code>{' '}
            to seed the growth plan tasks.
          </p>
        </div>
      ) : (
        <GrowthPlanBoard
          initialTasks={serialisedTasks}
          initialStartDate={startDate}
        />
      )}
    </div>
  );
}
