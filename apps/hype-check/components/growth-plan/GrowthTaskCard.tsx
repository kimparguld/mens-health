"use client";

import { useState } from "react";
import Link from "next/link";
import type { GrowthTask } from "./GrowthPlanBoard";

const STATUS_CONFIG: Record<
  GrowthTask["status"],
  { label: string; color: string; next: GrowthTask["status"] }
> = {
  TODO: {
    label: "To do",
    color: "bg-gray-100 text-gray-600",
    next: "IN_PROGRESS",
  },
  IN_PROGRESS: {
    label: "In progress",
    color: "bg-blue-100 text-blue-700",
    next: "DONE",
  },
  DONE: {
    label: "Done",
    color: "bg-indigo-100 text-indigo-700",
    next: "TODO",
  },
  SKIPPED: {
    label: "Skipped",
    color: "bg-yellow-100 text-yellow-700",
    next: "TODO",
  },
};

const PRIORITY_CONFIG: Record<
  GrowthTask["priority"],
  { label: string; color: string }
> = {
  HIGH: { label: "High", color: "bg-red-100 text-red-700" },
  MEDIUM: { label: "Medium", color: "bg-orange-100 text-orange-700" },
  LOW: { label: "Low", color: "bg-gray-100 text-gray-500" },
};

type Props = {
  task: GrowthTask;
  onStatusChange: (id: string, status: GrowthTask["status"]) => Promise<void>;
  onNotesSave: (id: string, notes: string) => Promise<void>;
};

export function GrowthTaskCard({ task, onStatusChange, onNotesSave }: Props) {
  const [savingStatus, setSavingStatus] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(task.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  const statusCfg = STATUS_CONFIG[task.status];
  const priorityCfg = PRIORITY_CONFIG[task.priority];

  async function cycleStatus() {
    setSavingStatus(true);
    await onStatusChange(task.id, statusCfg.next);
    setSavingStatus(false);
  }

  async function saveNotes() {
    setSavingNotes(true);
    await onNotesSave(task.id, notesValue);
    setSavingNotes(false);
    setEditingNotes(false);
  }

  return (
    <li
      className={`rounded-lg border p-4 transition-opacity ${task.status === "DONE" ? "opacity-60" : "opacity-100"} ${task.status === "DONE" ? "border-indigo-100 bg-indigo-50/30" : "border-gray-100 bg-gray-50"}`}
    >
      <div className="flex items-start gap-3">
        {/* Status toggle */}
        <button
          onClick={cycleStatus}
          disabled={savingStatus}
          title={`Mark as ${STATUS_CONFIG[statusCfg.next].label}`}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-indigo-600 hover:border-indigo-400 disabled:opacity-50"
        >
          {task.status === "DONE" && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
              <path
                d="M10 3L5 8.5 2 5.5"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {task.status === "IN_PROGRESS" && (
            <span className="h-2 w-2 rounded-full bg-blue-400" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-sm font-semibold ${task.status === "DONE" ? "text-gray-400 line-through" : "text-gray-900"}`}
            >
              {task.title}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusCfg.color}`}
            >
              {statusCfg.label}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityCfg.color}`}
            >
              {priorityCfg.label}
            </span>
            <span className="text-xs text-gray-400">
              Day {task.dayStart}–{task.dayEnd}
            </span>
          </div>

          {/* Description (expandable) */}
          {task.description && (
            <div className="mt-1">
              {expanded ? (
                <>
                  <p className="text-sm text-gray-600">{task.description}</p>
                  <button
                    onClick={() => setExpanded(false)}
                    className="mt-1 text-xs text-gray-400 hover:text-gray-600"
                  >
                    Hide
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Show details
                </button>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="mt-2">
            {editingNotes ? (
              <div className="space-y-1">
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={3}
                  placeholder="Add notes…"
                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {savingNotes ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setNotesValue(task.notes ?? "");
                      setEditingNotes(false);
                    }}
                    className="rounded-md px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                {task.notes && (
                  <p className="flex-1 text-xs text-gray-500 italic">
                    {task.notes}
                  </p>
                )}
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs whitespace-nowrap text-gray-400 hover:text-gray-600"
                >
                  {task.notes ? "Edit note" : "+ Add note"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Admin link */}
        {task.adminPath && (
          <Link
            href={task.adminPath}
            className="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:border-indigo-200 hover:text-indigo-700"
          >
            Open →
          </Link>
        )}
      </div>

      {/* Completed at */}
      {task.completedAt && (
        <p className="mt-2 text-xs text-gray-400">
          Completed {new Date(task.completedAt).toLocaleDateString()}
        </p>
      )}

      {/* Status cycling hint */}
      <div className="mt-2 flex gap-2">
        {(
          ["TODO", "IN_PROGRESS", "DONE", "SKIPPED"] as GrowthTask["status"][]
        ).map((s) => (
          <button
            key={s}
            disabled={task.status === s || savingStatus}
            onClick={async () => {
              setSavingStatus(true);
              await onStatusChange(task.id, s);
              setSavingStatus(false);
            }}
            className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
              task.status === s
                ? STATUS_CONFIG[s].color + " ring-1 ring-current"
                : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>
    </li>
  );
}
