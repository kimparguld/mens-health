'use client';

import Link from 'next/link';
import { Fragment, useEffect, useState, type ReactNode } from 'react';

export interface SiteHeaderUser {
  name?: string | null;
  email?: string | null;
  isPremium?: boolean;
}

export interface SiteHeaderNavLink {
  href: string;
  label: string;
  desktopClassName: string;
  mobileClassName: string;
  /** Render a hairline divider immediately before this link in the mobile drawer. */
  dividerBefore?: boolean;
}

export interface SiteHeaderClassNames {
  header: string;
  logoLink: string;
  hamburgerButton: string;
  drawerPanel: string;
  drawerNav: string;
  closeButton: string;
  accountLink: string;
  signInLink: string;
  premiumCta: string;
  mobileAccountLink: string;
  mobileSignInLink: string;
  mobilePremiumCta: string;
  navLinkChevron: string;
  accountChevron: string;
  signInChevron: string;
}

export interface SiteHeaderProps {
  user?: SiteHeaderUser;
  premiumEnabled: boolean;
  navLinks: SiteHeaderNavLink[];
  desktopLogo: ReactNode;
  drawerLogo: ReactNode;
  classNames: SiteHeaderClassNames;
}

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
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon({ className }: { className: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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

export function SiteHeader({ user, premiumEnabled, navLinks, desktopLogo, drawerLogo, classNames }: SiteHeaderProps) {
  const nav = useDrawer();
  const mounted = nav.mounted;
  const visible = nav.visible;
  const openDrawer = nav.open;
  const closeDrawer = nav.close;

  useEffect(() => {
    document.body.style.overflow = nav.mounted ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [nav.mounted]);

  return (
    <>
      <header className={classNames.header}>
        <div className="mx-auto flex max-w-280 items-center justify-between px-4 py-2 lg:py-4">
          <Link href="/" className={classNames.logoLink}>
            {desktopLogo}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={link.desktopClassName}>
                {link.label}
              </Link>
            ))}
            {premiumEnabled && (
              <>
                {user ? (
                  <Link href="/account" className={classNames.accountLink}>
                    {user.name ?? user.email ?? 'Account'}
                  </Link>
                ) : (
                  <Link href="/signin" className={classNames.signInLink}>
                    Sign in
                  </Link>
                )}
                {!user?.isPremium && (
                  <Link href="/upgrade" className={classNames.premiumCta}>
                    Go premium
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button type="button" onClick={openDrawer} className={classNames.hamburgerButton} aria-label="Open menu">
            <HamburgerIcon />
          </button>
        </div>
      </header>

      {/* ── Drawer ── stays mounted during exit transition ── */}
      {mounted && (
        <>
          <div
            onClick={closeDrawer}
            aria-hidden="true"
            className={[
              'fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden',
              `duration-[${TRANSITION_MS}ms]`,
              visible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className={[
              classNames.drawerPanel,
              `transition-transform duration-[${TRANSITION_MS}ms] ease-in-out`,
              visible ? 'translate-x-0' : 'translate-x-full',
            ].join(' ')}
          >
            <div className="flex items-center justify-between px-6 py-5">
              <Link href="/" onClick={closeDrawer} className={classNames.logoLink}>
                {drawerLogo}
              </Link>
              <button type="button" onClick={closeDrawer} className={classNames.closeButton} aria-label="Close menu">
                <CloseIcon />
              </button>
            </div>

            <div className="mx-6 border-hairline border-t" />

            <nav className={classNames.drawerNav}>
              {navLinks.map((link) => (
                <Fragment key={link.href}>
                  {link.dividerBefore && <div className="border-hairline -mx-4 mt-3 mb-6 border-t" />}
                  <Link href={link.href} onClick={closeDrawer} className={link.mobileClassName}>
                    {link.label}
                    <ChevronIcon className={classNames.navLinkChevron} />
                  </Link>
                </Fragment>
              ))}

              {premiumEnabled && (
                <>
                  {user ? (
                    <Link href="/account" onClick={closeDrawer} className={classNames.mobileAccountLink}>
                      {user.name ?? user.email ?? 'Account'}
                      <ChevronIcon className={classNames.accountChevron} />
                    </Link>
                  ) : (
                    <Link href="/signin" onClick={closeDrawer} className={classNames.mobileSignInLink}>
                      Sign in
                      <ChevronIcon className={classNames.signInChevron} />
                    </Link>
                  )}
                </>
              )}
            </nav>

            {!user?.isPremium && premiumEnabled && (
              <div className="px-5 pt-3 pb-8">
                <Link href="/upgrade" onClick={closeDrawer} className={classNames.mobilePremiumCta}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
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
