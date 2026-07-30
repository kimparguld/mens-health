import { env } from "@/env";

/**
 * AdDisclosure — visible only when ads are enabled.
 * Must appear near any ad slot per FTC guidelines.
 */
export function AdDisclosure() {
  const adsEnabled = env.NEXT_PUBLIC_ADS_ENABLED === "true";

  if (!adsEnabled) return null;

  return (
    <p className="text-xs text-gray-400" aria-label="Advertisement disclosure">
      Advertisement
    </p>
  );
}
