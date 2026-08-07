import { BrandLogotype } from '@/components/ui/BrandLogotype';
import { auth, signOut } from '@/lib/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    redirect('/admin/login');
  }

  const navGroups = [
    {
      section: null,
      items: [{ label: 'Dashboard', href: '/admin' }],
    },
    {
      section: 'Content',
      items: [
        { label: 'Review queue', href: '/admin/videos' },
        { label: 'Claims', href: '/admin/claims' },
        { label: 'Topics', href: '/admin/topics' },
        { label: 'Video processing jobs', href: '/admin/jobs' },
      ],
    },
    {
      section: 'Audience',
      items: [
        { label: 'Subscribers', href: '/admin/subscribers' },
        { label: 'Social drafts', href: '/admin/social/drafts' },
        { label: 'Social schedule', href: '/admin/social/calendar' },
      ],
    },
    {
      section: 'Growth',
      items: [
        { label: 'Growth hub', href: '/admin/growth' },
        { label: 'Content calendar', href: '/admin/content-calendar' },
        { label: 'Outreach CRM', href: '/admin/outreach' },
        { label: 'UTM builder', href: '/admin/marketing/utm-builder' },
        { label: 'Campaigns', href: '/admin/marketing/campaigns' },
        { label: 'Growth analytics', href: '/admin/analytics/growth' },
        { label: '90-day plan', href: '/admin/growth-plan' },
        { label: 'Weekly workflow', href: '/admin/weekly-growth' },
        { label: 'Monetization', href: '/admin/monetization' },
      ],
    },
    {
      section: 'Settings',
      items: [{ label: 'Social accounts', href: '/admin/social/accounts' }],
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="border-hairline flex w-65 flex-col border-r bg-white">
        <div className="border-hairline flex h-18 items-center border-b px-4">
          <BrandLogotype size="md" />
        </div>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-2">
          {navGroups.map(({ section, items }, i) => (
            <div key={section ?? `group-${i}`} className="flex flex-col gap-1">
              {section && (
                <span className="px-3 pt-2 text-sm font-semibold tracking-wide text-gray-400 uppercase">
                  {section}
                </span>
              )}
              {items.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className={twMerge(
                    'hover:bg-accent flex items-center justify-between rounded-md px-3 py-2 text-base text-gray-700 hover:text-white',
                    !section && 'text-lg font-semibold'
                  )}
                >
                  {label}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
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
            </div>
          ))}
        </nav>
        <div className="border-t p-4">
          <p className="mb-2 truncate text-xs text-gray-500">
            {session?.user?.email}
          </p>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/admin/login' });
            }}
          >
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-gray-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
