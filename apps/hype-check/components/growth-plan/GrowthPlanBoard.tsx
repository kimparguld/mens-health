"use client";

import { useState } from "react";
import { GrowthTaskCard } from "./GrowthTaskCard";
import {
  PHASES,
  getCurrentPhase,
  calculateProgress,
} from "@/lib/growth-plan/phase";
import type { PhaseId } from "@/lib/growth-plan/phase";

export type GrowthTask = {
  id: string;
  uniqueKey: string;
  phase: PhaseId;
  sortOrder: number;
  dayStart: number;
  dayEnd: number;
  title: string;
  description: string | null;
  adminPath: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "TODO" | "IN_PROGRESS" | "DONE" | "SKIPPED";
  notes: string | null;
  completedAt: string | null;
};

type Props = {
  initialTasks: GrowthTask[];
  initialStartDate: string | null;
};

export function GrowthPlanBoard({ initialTasks, initialStartDate }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [startDate, setStartDate] = useState(initialStartDate ?? "");
  const [savingDate, setSavingDate] = useState(false);

  // Filters
  const [filterCurrentPhase, setFilterCurrentPhase] = useState(false);
  const [filterIncomplete, setFilterIncomplete] = useState(false);
  const [filterHighPriority, setFilterHighPriority] = useState(false);

  const parsedStartDate = startDate ? new Date(startDate) : null;
  const currentPhase = parsedStartDate
    ? getCurrentPhase(parsedStartDate)
    : null;
  const progress = calculateProgress(tasks);

  const today = parsedStartDate
    ? Math.floor(
        (new Date().getTime() - parsedStartDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1
    : null;

  function filterTasks(phaseTasks: GrowthTask[], phaseId: PhaseId) {
    let result = phaseTasks;
    if (filterCurrentPhase && currentPhase !== phaseId) return [];
    if (filterIncomplete)
      result = result.filter(
        (t) => t.status !== "DONE" && t.status !== "SKIPPED",
      );
    if (filterHighPriority)
      result = result.filter((t) => t.priority === "HIGH");
    return result;
  }

  async function handleStatusChange(id: string, status: GrowthTask["status"]) {
    const res = await fetch(`/api/admin/growth-plan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { task: GrowthTask };
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data.task } : t)),
    );
  }

  async function handleNotesSave(id: string, notes: string) {
    const res = await fetch(`/api/admin/growth-plan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes || null }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { task: GrowthTask };
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data.task } : t)),
    );
  }

  async function handleStartDateSave() {
    if (!startDate.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    setSavingDate(true);
    await fetch("/api/admin/growth-plan/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ growthPlanStartDate: startDate }),
    });
    setSavingDate(false);
  }

  const completedByPhase = (phaseId: PhaseId) => {
    const phaseTasks = tasks.filter((t) => t.phase === phaseId);
    return calculateProgress(phaseTasks);
  };

  return (
    <div>
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
            Current phase
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {currentPhase
              ? (PHASES.find((p) => p.id === currentPhase)?.label ?? "—")
              : today === null
                ? "Not started"
                : today > 90
                  ? "Complete"
                  : "Not started"}
          </p>
          {today !== null && today > 0 && today <= 90 && (
            <p className="mt-0.5 text-xs text-gray-500">Day {today} of 90</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
            Overall progress
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {progress.percentage}%
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {progress.completed} / {progress.total} tasks
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
            Completed
          </p>
          <p className="mt-1 text-lg font-bold text-indigo-600">
            {progress.completed}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">
            Remaining
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {
              tasks.filter((t) => t.status !== "DONE" && t.status !== "SKIPPED")
                .length
            }
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>90-day plan progress</span>
          <span>{progress.percentage}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Start date + filters */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">
            Plan start date
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleStartDateSave}
              disabled={savingDate || !startDate}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingDate ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCurrentPhase((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filterCurrentPhase
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Current phase only
          </button>
          <button
            onClick={() => setFilterIncomplete((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filterIncomplete
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Incomplete only
          </button>
          <button
            onClick={() => setFilterHighPriority((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filterHighPriority
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            High priority only
          </button>
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-8">
        {PHASES.map((phase) => {
          const phaseTasks = tasks.filter((t) => t.phase === phase.id);
          const visible = filterTasks(phaseTasks, phase.id);
          const phaseProgress = completedByPhase(phase.id);
          const isActive = currentPhase === phase.id;

          return (
            <section
              key={phase.id}
              className={`rounded-xl border bg-white p-6 ${
                isActive ? "border-indigo-300 shadow-sm" : "border-gray-200"
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      Phase {PHASES.indexOf(phase) + 1}: {phase.label}
                    </h2>
                    {isActive && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-gray-400">
                    Day {phase.dayStart}–{phase.dayEnd}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">{phase.goal}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {phaseProgress.completed}/{phaseProgress.total}
                  </p>
                  <p className="text-xs text-gray-400">done</p>
                </div>
              </div>

              {visible.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No tasks match the current filters.
                </p>
              ) : (
                <ul className="space-y-3">
                  {visible.map((task) => (
                    <GrowthTaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onNotesSave={handleNotesSave}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
