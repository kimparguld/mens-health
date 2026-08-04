"use client";

import { useEffect, useState } from "react";
import { NewsletterSignupForm } from "../ui/NewsletterSignupForm";

// Show once the reader has scrolled 40% into the page, so it doesn't
// compete with the content above the fold.
const SCROLL_DEPTH_THRESHOLD = 0.4;
const DISMISS_STORAGE_KEY = "newsletter-sticky-dismissed";

type Props = {
  label: string;
};

export function NewsletterStickyCTA({ label }: Props) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem(DISMISS_STORAGE_KEY) === "1",
  );

  useEffect(() => {
    if (dismissed) return;

    function handleScroll() {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;

      if (window.scrollY / scrollableHeight >= SCROLL_DEPTH_THRESHOLD) {
        setVisible(true);
        window.removeEventListener("scroll", handleScroll);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [dismissed]);

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_STORAGE_KEY, "1");
  }

  if (dismissed || !visible) return null;

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 border-t border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg md:hidden">
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-emerald-900">
            {label}
          </p>
          <div className="mt-1">
            <NewsletterSignupForm compact />
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss newsletter signup"
          className="flex-shrink-0 text-emerald-600 hover:text-emerald-900"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
