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
    className:
      'font-semibold text-white underline decoration-transparent decoration-2 underline-offset-6 hover:decoration-ink',
  },
  {
    href: '/rankings',
    label: 'Rankings',
    className:
      'font-semibold text-white underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-ink',
  },
  {
    href: '/creators',
    label: 'Creators',
    className:
      'font-semibold text-white underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-ink',
  },
  {
    href: '/weekly',
    label: 'Weekly',
    className:
      'font-semibold text-white underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-ink',
  },
  {
    href: '/how-we-rate-evidence',
    label: 'How It Works',
    className:
      'font-semibold text-white underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-ink',
  },
  {
    href: '/newsletter',
    label: 'Newsletter',
    className:
      'rounded-sm bg-ink px-3 py-1.5 font-semibold text-paper hover:bg-ink/80',
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
      <header className="border-hairline bg-ink-muted sticky top-0 z-30 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-280 items-center justify-between px-4 py-2 lg:py-4">
          <Link
            href="/"
            className="focus-visible:ring-ink/40 rounded-md focus-visible:ring-2 focus-visible:outline-none"
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
            {user ? (
              <Link
                href="/account"
                className="hover:decoration-ink font-semibold text-white/60 underline decoration-transparent decoration-2 underline-offset-4"
              >
                {user.name ?? user.email ?? 'Account'}
              </Link>
            ) : (
              <Link href="/signin" className="text-ink-muted hover:text-ink">
                Sign in
              </Link>
            )}
            {!user?.isPremium && premium?.isEnabled() && (
              <Link
                href="/upgrade"
                className="bg-ink text-paper hover:bg-ink-muted rounded-sm px-3 py-1.5 font-semibold"
              >
                Go premium
              </Link>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={openDrawer}
            className="text-ink-muted hover:bg-surface hover:text-ink flex items-center justify-center rounded-md p-2 md:hidden"
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
              'border-hairline bg-paper fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-90 flex-col border-l md:hidden',
              `transition-transform duration-[${TRANSITION_MS}ms] ease-in-out`,
              visible ? 'translate-x-0' : 'translate-x-full',
            ].join(' ')}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5">
              <Link
                href="/"
                onClick={closeDrawer}
                className="focus-visible:ring-ink/40 rounded-md focus-visible:ring-2 focus-visible:outline-none"
              >
                <BrandLogotype size="sm" />
              </Link>
              <button
                type="button"
                onClick={closeDrawer}
                className="text-ink-muted hover:bg-surface hover:text-ink rounded-sm p-2"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="border-hairline mx-6 border-t" />

            {/* Nav links */}
            <nav className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeDrawer}
                  className="group text-ink hover:bg-surface active:bg-hairline/40 flex items-center justify-between rounded-md px-4 py-4 text-lg font-medium transition-colors"
                >
                  {link.label}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-hairline group-hover:text-ink-muted h-4 w-4 transition-transform group-hover:translate-x-0.5"
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

              <div className="border-hairline mx-2 my-3 border-t" />

              {user ? (
                <Link
                  href="/account"
                  onClick={closeDrawer}
                  className="group text-ink hover:bg-surface active:bg-hairline/40 flex items-center justify-between rounded-md px-4 py-4 text-lg font-medium transition-colors"
                >
                  {user.name ?? user.email ?? 'Account'}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-hairline group-hover:text-ink-muted h-4 w-4 transition-transform group-hover:translate-x-0.5"
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
                  className="group text-ink hover:bg-surface active:bg-hairline/40 flex items-center justify-between rounded-md px-4 py-4 text-lg font-medium transition-colors"
                >
                  Sign in
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-hairline group-hover:text-ink-muted h-4 w-4 transition-transform group-hover:translate-x-0.5"
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
            {!user?.isPremium && premium?.isEnabled() && (
              <div className="px-5 pt-3 pb-8">
                <Link
                  href="/upgrade"
                  onClick={closeDrawer}
                  className="bg-ink text-paper hover:bg-ink-muted active:bg-ink-muted flex w-full items-center justify-center gap-2 rounded-md px-5 py-4 text-base font-semibold transition-colors"
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
