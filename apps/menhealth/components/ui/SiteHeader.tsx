'use client';

import { BrandLogotype } from '@/components/ui/BrandLogotype';
import { premium } from '@/lib/flags/feature-flags';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type SessionUser = {
  name?: string | null;
  email?: string | null;
  isPremium?: boolean;
};

interface SiteHeaderProps {
  user?: SessionUser;
}

const navLinks = [
  {
    href: '/topics',
    label: 'Topics',
    className: 'font-semibold text-gray-800 hover:text-emerald-700',
  },
  {
    href: '/rankings',
    label: 'Rankings',
    className: 'font-semibold text-gray-800 hover:text-emerald-700',
  },
  {
    href: '/creators',
    label: 'Creators',
    className: 'font-semibold text-gray-800 hover:text-emerald-700',
  },
  {
    href: '/weekly',
    label: 'Weekly',
    className: 'font-semibold text-gray-800 hover:text-emerald-700',
  },
  {
    href: '/how-we-rate-evidence',
    label: 'How It Works',
    className: 'font-semibold text-gray-800 hover:text-emerald-700',
  },
  {
    href: '/newsletter',
    label: 'Newsletter',
    className:
      'rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700',
  },
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

  // Convenience aliases kept for readability
  const mounted = nav.mounted;
  const visible = nav.visible;
  const openDrawer = nav.open;
  const closeDrawer = nav.close;

  // Lock body scroll while either drawer is open
  useEffect(() => {
    document.body.style.overflow = nav.mounted ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [nav.mounted]);

  return (
    <>
      <header className="border-hairline sticky top-0 z-30 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-280 items-center justify-between px-4 py-2 lg:py-4">
          <Link
            href="/"
            className="rounded-md focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:outline-none"
          >
            <BrandLogotype size="md" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={link.className}>
                {link.label}
              </Link>
            ))}
            {premium?.isEnabled() && (
              <>
                {user ? (
                  <Link
                    href="/account"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                  >
                    {user.name ?? user.email ?? 'Account'}
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
              </>
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
              'fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden',
              `duration-[${TRANSITION_MS}ms]`,
              visible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />

          {/* Drawer panel — full height, 85 vw up to 360 px */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className={[
              'fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-90 flex-col bg-white shadow-2xl md:hidden',
              `transition-transform duration-[${TRANSITION_MS}ms] ease-in-out`,
              visible ? 'translate-x-0' : 'translate-x-full',
            ].join(' ')}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5">
              <Link
                href="/"
                onClick={closeDrawer}
                className="rounded-md focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:outline-none"
              >
                <BrandLogotype size="sm" />
              </Link>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mx-6 border-hairline border-t" />

            {/* Nav links */}
            <nav className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
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
                    className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-700"
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

              <div className="mx-2 my-3 border-hairline border-t" />
              {premium?.isEnabled() && (
                <>
                  {user ? (
                    <Link
                      href="/account"
                      onClick={closeDrawer}
                      className="group flex items-center justify-between rounded-xl px-4 py-4 text-lg font-medium text-gray-800 transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100"
                    >
                      {user.name ?? user.email ?? 'Account'}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-700"
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
                        className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-700"
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
                </>
              )}
            </nav>

            {/* CTA pinned to bottom */}
            {!user?.isPremium && premium?.isEnabled() && (
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
    </>
  );
}
