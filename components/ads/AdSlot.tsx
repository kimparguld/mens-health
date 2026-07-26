/**
 * AdSlot — display ad placeholder, disabled by default.
 *
 * Ads are opt-in via the ADS_ENABLED environment variable.
 * When disabled, this component renders nothing and loads no scripts.
 * When enabled, replace the inner div with your ad network code.
 */
type Props = {
  slot: "article-footer" | "sidebar" | "between-content";
  className?: string;
};

export function AdSlot({ slot, className }: Props) {
  const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";

  if (!adsEnabled) return null;

  return (
    <div data-ad-slot={slot} className={className} aria-label="Advertisement">
      {/* Ad network code goes here when ads are enabled */}
    </div>
  );
}
