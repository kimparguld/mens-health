import { BrandLogotype } from '@/components/ui/BrandLogotype';
import { premium } from '@/lib/flags/feature-flags';
import {
  SiteHeader as SharedSiteHeader,
  type SiteHeaderClassNames,
  type SiteHeaderNavLink,
  type SiteHeaderUser,
} from '@menhealth/ui';
import { twMerge } from 'tailwind-merge';

interface SiteHeaderProps {
  user?: SiteHeaderUser;
}

const NAV_LINK_CLASS =
  'font-semibold text-text-on-emphasis underline decoration-transparent decoration-2 underline-offset-4 hover:decoration-ink';
const MOBILE_LINK_CLASS =
  'group text-text-muted hover:bg-surface active:bg-hairline/40 flex items-center justify-between rounded-md px-4 py-4 text-lg font-medium transition-colors';

const NEWSLETTER_MOBILE_CLASS = twMerge(MOBILE_LINK_CLASS, 'bg-accent text-white hover:bg-accent/80 py-3');

const NAV_LINKS: SiteHeaderNavLink[] = [
  {
    href: '/topics',
    label: 'Topics',
    desktopClassName: twMerge(NAV_LINK_CLASS, 'underline-offset-6'),
    mobileClassName: MOBILE_LINK_CLASS,
  },
  { href: '/rankings', label: 'Rankings', desktopClassName: NAV_LINK_CLASS, mobileClassName: MOBILE_LINK_CLASS },
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
    desktopClassName: 'rounded-sm bg-accent px-3 py-1.5 font-semibold text-paper hover:bg-accent/80',
    mobileClassName: NEWSLETTER_MOBILE_CLASS,
    dividerBefore: true,
  },
];

const CLASS_NAMES: SiteHeaderClassNames = {
  header: 'border-hairline bg-bg-emphasis sticky top-0 z-30 border-b backdrop-blur-sm',
  headerInner: 'py-3 lg:py-4',
  logoLink: 'focus-visible:ring-accent/40 rounded-md focus-visible:ring-2 focus-visible:outline-none',
  hamburgerButton: 'hover:bg-surface hover:text-ink flex items-center justify-center rounded-md p-2 text-text-on-emphasis md:hidden',
  drawerPanel: 'border-hairline bg-bg-page fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-90 flex-col border-l md:hidden',
  drawerNav: 'flex flex-1 flex-col overflow-y-auto bg-white px-4 py-4',
  closeButton: 'text-text-muted hover:bg-surface hover:text-ink rounded-sm p-2',
  accountLink: 'hover:decoration-ink font-semibold text-white/60 underline decoration-transparent decoration-2 underline-offset-4',
  signInLink: 'text-text-muted hover:text-ink',
  premiumCta: 'bg-accent text-paper hover:bg-ink-muted rounded-sm px-3 py-1.5 font-semibold',
  mobileAccountLink: MOBILE_LINK_CLASS.replace('text-text-muted', 'text-text-muted/80'),
  mobileSignInLink: MOBILE_LINK_CLASS.replace('text-text-muted', 'text-ink'),
  mobilePremiumCta:
    'bg-accent text-paper hover:bg-ink-muted active:bg-ink-muted flex w-full items-center justify-center gap-2 rounded-md px-5 py-4 text-base font-semibold transition-colors',
  navLinkChevron: 'h-4 w-4 transition-transform group-hover:translate-x-0.5',
  accountChevron: 'text-ink-muted/80 group-hover:text-ink-muted h-4 w-4 transition-transform group-hover:translate-x-0.5',
  signInChevron: 'text-hairline group-hover:text-ink-muted h-4 w-4 transition-transform group-hover:translate-x-0.5',
};

export function SiteHeader({ user }: SiteHeaderProps) {
  return (
    <SharedSiteHeader
      user={user}
      premiumEnabled={premium?.isEnabled() ?? false}
      navLinks={NAV_LINKS}
      desktopLogo={<BrandLogotype size="md" />}
      drawerLogo={<BrandLogotype size="md" />}
      classNames={CLASS_NAMES}
    />
  );
}
