import Link from "next/link";
import { EvidenceBadge } from "../ui/EvidenceBadge";

type Claim = {
  id: string;
  slug: string | null;
  text: string;
  evidenceStatus: string;
};

type Props = {
  claims: Claim[];
  heading?: string;
};

export function RelatedClaims({ claims, heading = "Related claims" }: Props) {
  if (claims.length === 0) return null;

  return (
    <aside className="my-8">
      <h2 className="mb-3 text-base font-semibold text-gray-900">{heading}</h2>
      <ul className="space-y-2">
        {claims.map((claim) => {
          const href = `/claims/${claim.slug ?? claim.id}`;
          return (
            <li key={claim.id}>
              <Link
                href={href}
                className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 transition-colors hover:border-emerald-300 hover:text-emerald-800"
              >
                <span className="flex-1">{claim.text}</span>
                <EvidenceBadge status={claim.evidenceStatus} />
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
