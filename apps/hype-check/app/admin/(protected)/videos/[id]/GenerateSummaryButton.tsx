"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateSummaryButton({
  videoId,
}: {
  videoId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function generate() {
    setState("loading");
    setErrorMsg("");
    const res = await fetch(`/api/admin/videos/${videoId}/summarize`, {
      method: "POST",
    });
    if (res.ok) {
      setState("done");
      router.refresh();
    } else {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setErrorMsg(data?.error ?? "Failed to generate summary");
      setState("error");
    }
  }

  if (state === "done") return null;

  return (
    <div className="space-y-1">
      <button
        onClick={generate}
        disabled={state === "loading"}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {state === "loading" ? "Generating…" : "Generate summary"}
      </button>
      {state === "error" && <p className="text-xs text-red-600">{errorMsg}</p>}
    </div>
  );
}
