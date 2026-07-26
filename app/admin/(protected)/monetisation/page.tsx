import Link from "next/link";
import { premium } from "@/lib/flags/feature-flags";

const MONETISATION_DOCS = [
  {
    label: "Affiliate disclosure",
    href: "/affiliate-disclosure",
    desc: "Public affiliate disclosure page",
  },
  {
    label: "Medical disclaimer",
    href: "/medical-disclaimer",
    desc: "Required disclaimer on all health content",
  },
];

export default function MonetisationPage() {
  const premiumEnabled = premium.isEnabled();

  const settings = [
    {
      label: "Display ads",
      description:
        "Google AdSense or similar. Disabled by default — enable via NEXT_PUBLIC_ADS_ENABLED env var.",
      enabled: process.env.NEXT_PUBLIC_ADS_ENABLED === "true",
      note: "Set NEXT_PUBLIC_ADS_ENABLED=true to enable. Add ad network code to /components/ads/AdSlot.tsx.",
    },
    {
      label: "Affiliate links",
      description:
        "Affiliate product links with AffiliateDisclosure component.",
      enabled: true,
      note: "Always add AffiliateDisclosure near any affiliate link.",
    },
    {
      label: "Sponsor blocks",
      description: "Sponsored content placements using SponsorBlock component.",
      enabled: true,
      note: "Sponsor content must be clearly marked. Check FTC disclosure guidelines.",
    },
    {
      label: "Premium subscriptions",
      description: "Stripe-powered premium tier behind PremiumGate component.",
      enabled: premiumEnabled,
      note: premiumEnabled
        ? "Premium is enabled."
        : "Premium is disabled. Update lib/flags/feature-flags.ts to enable.",
    },
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Monetisation Settings
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        Control which monetisation channels are active. Newsletter conversion
        remains the primary goal.
      </p>

      <div className="mb-8 space-y-4">
        {settings.map((s) => (
          <div
            key={s.label}
            className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-900">
                  {s.label}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.enabled
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {s.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{s.description}</p>
              <p className="mt-1 text-xs text-amber-700">{s.note}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="mb-8 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Revenue strategy
        </h2>
        <ol className="space-y-1 text-sm text-gray-600">
          <li>1. Newsletter subscription (primary goal)</li>
          <li>2. Affiliate links (relevant products only)</li>
          <li>3. Sponsor blocks (clearly marked)</li>
          <li>4. Premium subscriptions (future)</li>
          <li>5. Display ads (future, disabled by default)</li>
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Compliance pages
        </h2>
        <ul className="flex flex-wrap gap-3">
          {MONETISATION_DOCS.map((d) => (
            <li key={d.href}>
              <Link
                href={d.href}
                target="_blank"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-emerald-700 underline hover:border-emerald-300"
              >
                {d.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
