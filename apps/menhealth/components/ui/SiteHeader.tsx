import { BrandLogotype } from '@/components/ui/BrandLogotype';
import { premium } from '@/lib/flags/feature-flags';
import {
  SiteHeader as SharedSiteHeader,
  type SiteHeaderClassNames,
  type SiteHeaderNavLink,
  type SiteHeaderUser,
} from '@menhealth/ui';

interface SiteHeaderProps {
  user?: SiteHeaderUser;
}

const NAV_LINK_CLASS = 'font-semibold text-gray-800 hover:text-accent-strong';
const MOBILE_LINK_CLASS =
  'group flex items-center justify-between rounded-xl px-4 py-4 text-lg font-medium text-gray-800 transition-colors hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100';

const NAV_LINKS: SiteHeaderNavLink[] = [
  { href: '/topics', label: 'Topics', desktopClassName: NAV_LINK_CLASS, mobileClassName: MOBILE_LINK_CLASS },
  { href: '/rankings', label: 'Rankings', desktopClassName: NAV_LINK_CLASS, mobileClassName: MOBILE_LINK_CLASS },
  { href: '/creators', label: 'Creators', desktopClassName: NAV_LINK_CLASS, mobileClassName: MOBILE_LINK_CLASS },
  { href: '/weekly', label: 'Weekly', desktopClassName: NAV_LINK_CLASS, mobileClassName: MOBILE_LINK_CLASS },
  {
    href: '/how-we-rate-evidence',
    label: 'How It Works',
    desktopClassName: NAV_LINK_CLASS,
    mobileClassName: MOBILE_LINK_CLASS,
  },
  {
    href: '/newsletter',
    label: 'Newsletter',
    desktopClassName: 'rounded-lg bg-accent px-3 py-1.5 font-semibold text-white hover:bg-accent-strong',
    mobileClassName: MOBILE_LINK_CLASS,
  },
];

const CLASS_NAMES: SiteHeaderClassNames = {
  header: 'border-hairline sticky top-0 z-30 border-b bg-bg-surface/80 backdrop-blur-sm',
  headerInner: 'py-2 lg:py-4',
  logoLink: 'rounded-md focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none',
  hamburgerButton:
    'flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:hidden',
  drawerPanel: 'bg-bg-surface fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-90 flex-col shadow-2xl md:hidden',
  drawerNav: 'flex flex-1 flex-col overflow-y-auto px-4 py-4',
  closeButton: 'rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  accountLink: 'rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50',
  signInLink: 'text-gray-600 hover:text-gray-900',
  premiumCta: 'rounded-lg bg-accent px-3 py-1.5 font-semibold text-white hover:bg-accent-strong',
  mobileAccountLink: MOBILE_LINK_CLASS,
  mobileSignInLink: MOBILE_LINK_CLASS,
  mobilePremiumCta:
    'flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong active:bg-accent-strong',
  navLinkChevron: 'h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-700',
  accountChevron: 'h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-700',
  signInChevron: 'h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-700',
};

export function SiteHeader({ user }: SiteHeaderProps) {
  return (
    <SharedSiteHeader
      user={user}
      premiumEnabled={premium?.isEnabled() ?? false}
      navLinks={NAV_LINKS}
      desktopLogo={<BrandLogotype size="md" />}
      drawerLogo={<BrandLogotype size="sm" />}
      classNames={CLASS_NAMES}
      trailingDivider
    />
  );
}
