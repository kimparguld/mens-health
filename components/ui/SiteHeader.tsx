"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";

type SessionUser = {
  name?: string | null;
  email?: string | null;
  isPremium?: boolean;
};

interface SiteHeaderProps {
  user?: SessionUser;
}

const navLinks = [
  { href: "/how-we-rate-evidence", label: "How It Works" },
  { href: "/digest", label: "Newsletter" },
];

function HamburgerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

const TRANSITION_MS = 300;

function useDrawer() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const open = () => setMounted(true);
  const close = () => {
    setVisible(false);
    setTimeout(() => setMounted(false), TRANSITION_MS);
  };

  useEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  return { mounted, visible, open, close };
}

export function SiteHeader({ user }: SiteHeaderProps) {
  const nav = useDrawer();
  const topics = useDrawer();

  // Convenience aliases kept for readability
  const mounted = nav.mounted;
  const visible = nav.visible;
  const openDrawer = nav.open;
  const closeDrawer = nav.close;

  // Lock body scroll while either drawer is open
  useEffect(() => {
    document.body.style.overflow =
      nav.mounted || topics.mounted ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [nav.mounted, topics.mounted]);

  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-280 items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-emerald-700 hover:text-emerald-600"
          >
            MenHealth Digest
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 text-sm md:flex">
            <button
              type="button"
              onClick={topics.open}
              className="cursor-pointer text-gray-600 hover:text-emerald-700"
            >
              Topics
            </button>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-600 hover:text-emerald-700"
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <Link
                href="/account"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                {user.name ?? user.email ?? "Account"}
              </Link>
            ) : (
              <Link
                href="/signin"
                className="text-gray-600 hover:text-gray-900"
              >
                Sign in
              </Link>
            )}
            {!user?.isPremium && (
              <Link
                href="/upgrade"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700"
              >
                Go premium
              </Link>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={openDrawer}
            className="flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:hidden"
            aria-label="Open menu"
          >
            <HamburgerIcon />
          </button>
        </div>
      </header>

      {/* ── Drawer ── stays mounted during exit transition ── */}
      {mounted && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            aria-hidden="true"
            className={[
              "fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden",
              `duration-[${TRANSITION_MS}ms]`,
              visible ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />

          {/* Drawer panel — full height, 85 vw up to 360 px */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className={[
              "fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-90 flex-col bg-white shadow-2xl md:hidden",
              `transition-transform duration-[${TRANSITION_MS}ms] ease-in-out`,
              visible ? "translate-x-0" : "translate-x-full",
            ].join(" ")}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5">
              <Link
                href="/"
                onClick={closeDrawer}
                className="text-lg font-bold tracking-tight text-gray-900"
              >
                MenHealth Digest
              </Link>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mx-6 border-t border-gray-100" />

            {/* Nav links */}
            <nav className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  topics.open();
                }}
                className="group flex items-center justify-between rounded-xl px-4 py-4 text-lg font-medium text-gray-800 transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100"
              >
                Topics
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeDrawer}
                  className="group flex items-center justify-between rounded-xl px-4 py-4 text-lg font-medium text-gray-800 transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100"
                >
                  {link.label}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ))}

              <div className="mx-2 my-3 border-t border-gray-100" />

              {user ? (
                <Link
                  href="/account"
                  onClick={closeDrawer}
                  className="group flex items-center justify-between rounded-xl px-4 py-4 text-lg font-medium text-gray-800 transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100"
                >
                  {user.name ?? user.email ?? "Account"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ) : (
                <Link
                  href="/signin"
                  onClick={closeDrawer}
                  className="group flex items-center justify-between rounded-xl px-4 py-4 text-lg font-medium text-gray-800 transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100"
                >
                  Sign in
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              )}
            </nav>

            {/* CTA pinned to bottom */}
            {!user?.isPremium && (
              <div className="px-5 pt-3 pb-8">
                <Link
                  href="/upgrade"
                  onClick={closeDrawer}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 3l14 9-14 9V3z"
                    />
                  </svg>
                  Go premium
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Topics Drawer ── */}
      {topics.mounted && (
        <>
          {/* Backdrop */}
          <div
            onClick={topics.close}
            aria-hidden="true"
            className={[
              "fixed inset-0 z-40 bg-black/60 transition-opacity",
              `duration-[${TRANSITION_MS}ms]`,
              topics.visible ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />

          {/* Drawer panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Browse topics"
            className={[
              "fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-90 flex-col bg-white shadow-2xl",
              `transition-transform duration-[${TRANSITION_MS}ms] ease-in-out`,
              topics.visible ? "translate-x-0" : "translate-x-full",
            ].join(" ")}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5">
              <span className="text-lg font-bold tracking-tight text-gray-900">
                Browse Topics
              </span>
              <button
                type="button"
                onClick={topics.close}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close topics"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mx-6 border-t border-gray-100" />

            {/* Topic links */}
            <nav className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
              {TOPIC_SEEDS.map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/topics/${topic.slug}`}
                  onClick={topics.close}
                  className="group flex flex-col rounded-xl px-4 py-3 transition-colors hover:bg-gray-100 active:bg-gray-200"
                >
                  <span className="text-base font-medium text-gray-800 group-hover:text-emerald-700">
                    {topic.name}
                  </span>
                  <span className="mt-0.5 text-xs leading-snug text-gray-400">
                    {topic.description}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
