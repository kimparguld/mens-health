import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCurrentPhase,
  getCurrentDayInPlan,
  calculateProgress,
  PHASES,
} from "@/lib/growth-plan/phase";
import { GROWTH_PLAN_TASKS } from "@/lib/growth-plan/tasks";

// ---- Phase calculation ----

describe("getCurrentDayInPlan", () => {
  it("returns 1 on the start date", () => {
    const start = new Date("2024-01-01");
    expect(getCurrentDayInPlan(start, new Date("2024-01-01"))).toBe(1);
  });

  it("returns 14 on the last day of foundation", () => {
    const start = new Date("2024-01-01");
    expect(getCurrentDayInPlan(start, new Date("2024-01-14"))).toBe(14);
  });

  it("returns 90 on the last day of scale", () => {
    const start = new Date("2024-01-01");
    expect(getCurrentDayInPlan(start, new Date("2024-03-30"))).toBe(90);
  });
});

describe("getCurrentPhase", () => {
  it("returns FOUNDATION on day 1", () => {
    const start = new Date("2024-01-01");
    expect(getCurrentPhase(start, new Date("2024-01-01"))).toBe("FOUNDATION");
  });

  it("returns FOUNDATION on day 14", () => {
    const start = new Date("2024-01-01");
    expect(getCurrentPhase(start, new Date("2024-01-14"))).toBe("FOUNDATION");
  });

  it("returns DISTRIBUTION on day 15", () => {
    const start = new Date("2024-01-01");
    expect(getCurrentPhase(start, new Date("2024-01-15"))).toBe("DISTRIBUTION");
  });

  it("returns DISTRIBUTION on day 30", () => {
    const start = new Date("2024-01-01");
    expect(getCurrentPhase(start, new Date("2024-01-30"))).toBe("DISTRIBUTION");
  });

  it("returns OPTIMISATION on day 31", () => {
    const start = new Date("2024-01-01");
    expect(getCurrentPhase(start, new Date("2024-01-31"))).toBe("OPTIMISATION");
  });

  it("returns OPTIMISATION on day 60", () => {
    const start = new Date("2024-01-01");
    expect(getCurrentPhase(start, new Date("2024-02-29"))).toBe("OPTIMISATION"); // leap year: day 60
  });

  it("returns SCALE on day 61", () => {
    const start = new Date("2024-01-01");
    expect(getCurrentPhase(start, new Date("2024-03-01"))).toBe("SCALE"); // leap year: day 61
  });

  it("returns SCALE on day 90", () => {
    const start = new Date("2024-01-01");
    expect(getCurrentPhase(start, new Date("2024-03-30"))).toBe("SCALE");
  });

  it("returns null before plan starts", () => {
    const start = new Date("2024-02-01");
    expect(getCurrentPhase(start, new Date("2024-01-31"))).toBeNull();
  });

  it("returns null after plan ends (day 91+)", () => {
    const start = new Date("2024-01-01");
    expect(getCurrentPhase(start, new Date("2024-04-01"))).toBeNull();
  });
});

// ---- Progress calculation ----

describe("calculateProgress", () => {
  it("returns 0% when no tasks are done", () => {
    const tasks = [
      { status: "TODO" },
      { status: "IN_PROGRESS" },
      { status: "SKIPPED" },
    ];
    const result = calculateProgress(tasks);
    expect(result.completed).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.total).toBe(3);
  });

  it("returns 100% when all tasks are done", () => {
    const tasks = [{ status: "DONE" }, { status: "DONE" }];
    const result = calculateProgress(tasks);
    expect(result.completed).toBe(2);
    expect(result.percentage).toBe(100);
  });

  it("calculates partial completion correctly", () => {
    const tasks = [
      { status: "DONE" },
      { status: "DONE" },
      { status: "TODO" },
      { status: "TODO" },
    ];
    const result = calculateProgress(tasks);
    expect(result.completed).toBe(2);
    expect(result.percentage).toBe(50);
  });

  it("returns 0% for empty task list", () => {
    const result = calculateProgress([]);
    expect(result.percentage).toBe(0);
    expect(result.total).toBe(0);
  });

  it("rounds percentages correctly", () => {
    const tasks = [{ status: "DONE" }, { status: "TODO" }, { status: "TODO" }];
    const result = calculateProgress(tasks);
    expect(result.percentage).toBe(33); // Math.round(1/3 * 100)
  });
});

// ---- Seed data: duplicate-safe unique keys ----

describe("GROWTH_PLAN_TASKS seed data", () => {
  it("has no duplicate uniqueKey values", () => {
    const keys = GROWTH_PLAN_TASKS.map((t) => t.uniqueKey);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("has tasks for all four phases", () => {
    const phases = new Set(GROWTH_PLAN_TASKS.map((t) => t.phase));
    expect(phases.has("FOUNDATION")).toBe(true);
    expect(phases.has("DISTRIBUTION")).toBe(true);
    expect(phases.has("OPTIMISATION")).toBe(true);
    expect(phases.has("SCALE")).toBe(true);
  });

  it("every task has a title and dayStart/dayEnd in range", () => {
    for (const task of GROWTH_PLAN_TASKS) {
      expect(task.title.length).toBeGreaterThan(0);
      expect(task.dayStart).toBeGreaterThanOrEqual(1);
      expect(task.dayEnd).toBeLessThanOrEqual(90);
      expect(task.dayStart).toBeLessThanOrEqual(task.dayEnd);
    }
  });

  it("every task has a valid priority", () => {
    const validPriorities = new Set(["HIGH", "MEDIUM", "LOW"]);
    for (const task of GROWTH_PLAN_TASKS) {
      expect(validPriorities.has(task.priority)).toBe(true);
    }
  });

  it("FOUNDATION tasks all have dayEnd <= 14", () => {
    const foundation = GROWTH_PLAN_TASKS.filter(
      (t) => t.phase === "FOUNDATION",
    );
    for (const task of foundation) {
      expect(task.dayEnd).toBeLessThanOrEqual(14);
    }
  });

  it("SCALE tasks all have dayStart >= 61", () => {
    const scale = GROWTH_PLAN_TASKS.filter((t) => t.phase === "SCALE");
    for (const task of scale) {
      expect(task.dayStart).toBeGreaterThanOrEqual(61);
    }
  });
});

// ---- PHASES config sanity ----

describe("PHASES config", () => {
  it("covers days 1–90 without gaps", () => {
    const sortedPhases = [...PHASES].sort((a, b) => a.dayStart - b.dayStart);
    expect(sortedPhases[0].dayStart).toBe(1);
    expect(sortedPhases[sortedPhases.length - 1].dayEnd).toBe(90);
    for (let i = 1; i < sortedPhases.length; i++) {
      expect(sortedPhases[i].dayStart).toBe(sortedPhases[i - 1].dayEnd + 1);
    }
  });
});
