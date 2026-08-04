import { ImageResponse } from "next/og";

export const alt = "MenHealth Digest — Evidence-Aware Men's Health Summaries";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          backgroundColor: "#ffffff",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 72,
            height: 10,
            backgroundColor: "#059669",
            borderRadius: 6,
            marginBottom: 40,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            color: "#111827",
            lineHeight: 1.1,
            maxWidth: 980,
          }}
        >
          MenHealth Digest
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 34,
            color: "#4b5563",
            maxWidth: 900,
          }}
        >
          Evidence-aware men&apos;s health summaries — without the hype.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 56,
            fontSize: 24,
            color: "#059669",
            fontWeight: 600,
          }}
        >
          hype-check.net
        </div>
      </div>
    ),
    { ...size },
  );
}
