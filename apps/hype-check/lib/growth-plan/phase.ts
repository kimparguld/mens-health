export type PhaseId = "FOUNDATION" | "DISTRIBUTION" | "OPTIMISATION" | "SCALE";

export const PHASES: {
  id: PhaseId;
  label: string;
  goal: string;
  dayStart: number;
  dayEnd: number;
}[] = [
  {
    id: "FOUNDATION",
    label: "Foundation",
    goal: "Make the site measurable, indexable, and conversion-ready.",
    dayStart: 1,
    dayEnd: 14,
  },
  {
    id: "DISTRIBUTION",
    label: "Distribution",
    goal: "Build repeatable weekly publishing workflow.",
    dayStart: 15,
    dayEnd: 30,
  },
  {
    id: "OPTIMISATION",
    label: "Optimisation",
    goal: "Improve what's working, double down on top pages.",
    dayStart: 31,
    dayEnd: 60,
  },
  {
    id: "SCALE",
    label: "Scale",
    goal: "Increase output around best topics, build relationships.",
    dayStart: 61,
    dayEnd: 90,
  },
];

export function getCurrentDayInPlan(startDate: Date, now = new Date()): number {
  return (
    Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) +
    1
  );
}

export function getCurrentPhase(
  startDate: Date,
  now = new Date(),
): PhaseId | null {
  const day = getCurrentDayInPlan(startDate, now);
  for (const phase of PHASES) {
    if (day >= phase.dayStart && day <= phase.dayEnd) {
      return phase.id;
    }
  }
  return null;
}

export function calculateProgress(tasks: { status: string }[]): {
  total: number;
  completed: number;
  percentage: number;
} {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "DONE").length;
  return {
    total,
    completed,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}
