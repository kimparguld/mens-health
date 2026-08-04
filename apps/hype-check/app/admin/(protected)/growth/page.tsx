import Link from "next/link";

const sections = [
  {
    heading: "Content",
    links: [
      {
        label: "Content calendar",
        href: "/admin/content-calendar",
        desc: "Scheduled claims, topics, newsletter, social",
      },
      {
        label: "Social drafts",
        href: "/admin/social/drafts",
        desc: "Review and approve social posts",
      },
      {
        label: "Social schedule",
        href: "/admin/social/calendar",
        desc: "Weekly view of scheduled social posts",
      },
    ],
  },
  {
    heading: "SEO & Distribution",
    links: [
      {
        label: "UTM builder",
        href: "/admin/marketing/utm-builder",
        desc: "Build tracked campaign links",
      },
      {
        label: "Campaigns",
        href: "/admin/marketing/campaigns",
        desc: "Track paid and organic campaigns",
      },
      {
        label: "Outreach CRM",
        href: "/admin/outreach",
        desc: "Creator outreach and partner tracking",
      },
    ],
  },
  {
    heading: "Growth Plans",
    links: [
      {
        label: "90-day growth plan",
        href: "/admin/growth-plan",
        desc: "Foundation, distribution, optimisation, scale",
      },
      {
        label: "Weekly operating system",
        href: "/admin/weekly-growth",
        desc: "Mon–Sun workflow for growth tasks",
      },
      {
        label: "Growth loop",
        href: "/admin/growth-loop",
        desc: "SEO → social → newsletter → revenue",
      },
    ],
  },
  {
    heading: "Analytics",
    links: [
      {
        label: "Growth analytics",
        href: "/admin/analytics/growth",
        desc: "SEO, newsletter, social, outreach metrics",
      },
      {
        label: "Newsletter subscribers",
        href: "/admin/subscribers",
        desc: "Subscriber list and source attribution",
      },
    ],
  },
  {
    heading: "Monetisation",
    links: [
      {
        label: "Monetisation settings",
        href: "/admin/monetisation",
        desc: "Ads, affiliates, sponsors, premium toggles",
      },
    ],
  },
];

export default function AdminGrowthPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Growth Hub</h1>
      <p className="mb-8 text-sm text-gray-500">
        Everything you need to run the traffic engine: content → SEO → social →
        newsletter → revenue.
      </p>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              {section.heading}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex flex-col rounded-xl border border-gray-200 bg-white px-4 py-4 transition-all hover:border-indigo-300 hover:shadow-sm"
                  >
                    <span className="text-sm font-semibold text-gray-900">
                      {link.label}
                    </span>
                    <span className="mt-1 text-xs text-gray-500">
                      {link.desc}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
