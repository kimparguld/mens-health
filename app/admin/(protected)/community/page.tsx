"use client";

import { useState } from "react";

const SUBREDDIT_CHECKLIST = [
  "Post is valuable without any links",
  "Does not directly promote the site",
  "Follows subreddit rules (check sidebar)",
  "Discloses affiliation if linking",
  "Not duplicate of recent post",
];

const DRAFT_TEMPLATES = [
  {
    name: "Discussion starter",
    body: `I've been reviewing trending men's health videos this week. The most repeated claim was that sleep matters more than supplements for testosterone.

The supplement claims were far less consistent across videos.

Curious what this community sees: which men's health claims keep coming up in the content you watch?`,
  },
  {
    name: "Evidence check",
    body: `Been noticing a lot of videos making strong claims about [topic] this week.

The evidence on this is actually more nuanced than most videos suggest — most studies are small or short-term.

What's your experience been? Has the advice held up in practice?`,
  },
  {
    name: "Resource sharing",
    body: `Quick summary of what the evidence actually says about [topic] based on the research I've been tracking:

• [Point 1]
• [Point 2]  
• [Point 3]

Happy to dig into any of these if helpful. What do people here usually find most useful?`,
  },
] as const;

export default function CommunityDraftsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [draft, setDraft] = useState<string>(DRAFT_TEMPLATES[0].body);
  const [community, setCommunity] = useState("");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<boolean[]>(
    SUBREDDIT_CHECKLIST.map(() => false),
  );

  const allChecked = checklist.every(Boolean);

  function loadTemplate(i: number) {
    setSelectedTemplate(i);
    if (DRAFT_TEMPLATES && DRAFT_TEMPLATES[i]?.body) {
      setDraft(DRAFT_TEMPLATES[i].body);
    }
  }

  function toggleCheck(i: number) {
    setChecklist((prev) => prev.map((v, j) => (j === i ? !v : v)));
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Community Draft Assistant
      </h1>
      <p className="mb-1 text-sm text-gray-500">
        Generate useful community posts for Reddit and forums.
      </p>
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>No auto-posting.</strong> These are drafts only. Always post
        manually and disclose your affiliation if you include a link.
      </div>

      {/* Template selector */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold text-gray-500">
          Draft template
        </p>
        <div className="flex gap-2">
          {DRAFT_TEMPLATES.map((t, i) => (
            <button
              key={t.name}
              onClick={() => loadTemplate(i)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedTemplate === i
                  ? "bg-emerald-700 text-white"
                  : "border border-gray-200 text-gray-600 hover:border-emerald-400"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Community */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Target community (e.g. r/Testosterone, r/LifeAfter30)
        </label>
        <input
          type="text"
          value={community}
          onChange={(e) => setCommunity(e.target.value)}
          placeholder="r/subreddit"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        />
      </div>

      {/* Draft textarea */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Draft post
        </label>
        <textarea
          rows={8}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        />
      </div>

      {/* Checklist */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold text-gray-500">
          Pre-post checklist
        </p>
        <ul className="space-y-2">
          {SUBREDDIT_CHECKLIST.map((item, i) => (
            <li key={item} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                id={`check-${i}`}
                checked={checklist[i]}
                onChange={() => toggleCheck(i)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600"
              />
              <label htmlFor={`check-${i}`} className="text-gray-700">
                {item}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Notes (optional)
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes, posting URL, result…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
        />
      </div>

      {!allChecked && (
        <p className="mb-3 text-xs text-amber-700">
          Complete the pre-post checklist before posting.
        </p>
      )}

      <div className="flex gap-3">
        <button
          disabled={!allChecked || !community}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
          onClick={() => {
            navigator.clipboard.writeText(draft);
          }}
        >
          Copy draft to clipboard
        </button>
      </div>
    </div>
  );
}
