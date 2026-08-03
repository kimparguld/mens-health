import { AffiliateDisclosure } from "../ui/AffiliateDisclosure";

interface SponsorBlockProps {
  name: string;
  copyText: string;
  ctaText: string;
  ctaUrl: string;
}

export function SponsorBlock({
  name,
  copyText,
  ctaText,
  ctaUrl,
}: SponsorBlockProps) {
  return (
    <aside
      aria-label={`Sponsored by ${name}`}
      className="rounded-xl border border-amber-200 bg-amber-50 p-5"
    >
      <p className="mb-1 text-xs font-semibold tracking-wide text-amber-700 uppercase">
        Sponsored
      </p>
      <p className="text-sm text-gray-800">{copyText}</p>
      <a
        href={ctaUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
      >
        {ctaText}
      </a>
      <div className="mt-3">
        <AffiliateDisclosure />
      </div>
    </aside>
  );
}
