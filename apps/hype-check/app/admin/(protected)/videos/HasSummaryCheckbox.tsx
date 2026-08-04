"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function HasSummaryCheckbox({ checked }: { checked: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.checked) {
      params.set("hasSummary", "true");
      params.delete("noSummary");
    } else {
      params.delete("hasSummary");
    }
    // Reset to page 1 when filter changes
    params.delete("page");
    router.push(`/admin/videos?${params.toString()}`);
  }

  return (
    <label className="ml-2 flex cursor-pointer items-center gap-2 text-sm text-gray-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="rounded border-gray-300"
      />
      Show videos with summaries
    </label>
  );
}
