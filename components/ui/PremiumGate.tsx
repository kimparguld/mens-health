import Link from "next/link";
import { premium } from "@/lib/flags/feature-flags";

interface PremiumGateProps {
  isPremium: boolean;
  children: React.ReactNode;
}

export function PremiumGate({ isPremium, children }: PremiumGateProps) {
  if (isPremium || !premium?.isEnabled()) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div
        className="pointer-events-none blur-sm select-none"
        aria-hidden="true"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/85 p-6 text-center backdrop-blur-[1px]">
        <p className="mb-1 text-sm font-semibold text-gray-900">
          Premium content
        </p>
        <p className="mb-4 text-xs text-gray-500">
          Upgrade to see the full evidence breakdown.
        </p>
        <Link
          href="/upgrade"
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Upgrade — $9/mo
        </Link>
      </div>
    </div>
  );
}
