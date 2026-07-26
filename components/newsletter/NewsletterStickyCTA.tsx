"use client";

import { useState } from "react";
import { NewsletterSignupForm } from "@/components/ui/NewsletterSignupForm";

export function NewsletterStickyCTA() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 border-t border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg md:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-emerald-900">
            Free weekly men&apos;s health digest
          </p>
          <div className="mt-1">
            <NewsletterSignupForm compact />
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss newsletter signup"
          className="flex-shrink-0 text-emerald-600 hover:text-emerald-900"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
