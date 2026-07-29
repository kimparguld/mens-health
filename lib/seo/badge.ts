// Pure SVG builder for the embeddable "Reviewed by MenHealth Digest" badge.
// No I/O — easily unit-tested.

export type BadgeInput = {
  evidenceLabel: string;
  color: string;
};

export function evidenceLabelAndColor(evidenceScore: number | null): {
  label: string;
  color: string;
} {
  if (evidenceScore == null) return { label: "Not yet rated", color: "#6b7280" };
  if (evidenceScore >= 0.7) return { label: "Strong evidence", color: "#16a34a" };
  if (evidenceScore >= 0.4) return { label: "Mixed evidence", color: "#d97706" };
  return { label: "Weak evidence", color: "#dc2626" };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildBadgeSvg({ evidenceLabel, color }: BadgeInput): string {
  const label = escapeXml(evidenceLabel);
  const width = 210;
  const height = 50;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Reviewed by MenHealth Digest — ${label}">
  <rect width="${width}" height="${height}" rx="8" fill="#111827" />
  <rect x="0" y="${height - 6}" width="${width}" height="6" rx="0" fill="${color}" />
  <text x="12" y="20" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="700" fill="#ffffff">Reviewed by MenHealth Digest</text>
  <text x="12" y="36" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="${color}">${label}</text>
</svg>`;
}
