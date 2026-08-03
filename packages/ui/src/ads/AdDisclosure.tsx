/**
 * AdDisclosure — visible only when ads are enabled.
 * Must appear near any ad slot per FTC guidelines.
 */
export function AdDisclosure({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <p className="text-xs text-gray-400" aria-label="Advertisement disclosure">
      Advertisement
    </p>
  );
}
