import type { Metadata } from "next";
import { createMetadata } from "@/lib/seo/site-metadata";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.hype-check.net";

export const metadata: Metadata = createMetadata({
  title: "Free Embeddable Widget — Hype Check",
  description:
    "Embed trending, evidence-checked reviews on your site — free JS widget, iframe, RSS, and JSON API.",
  path: "/widgets",
});

const scriptSnippet = `<script
  src="${APP_URL}/widgets/trending.js"
  data-topic="side-hustles"
  data-count="5">
</script>`;

const iframeSnippet = `<iframe
  src="${APP_URL}/widgets/trending/embed?topic=side-hustles&count=5"
  width="360"
  height="400"
  style="border:1px solid #e5e7eb;border-radius:8px;"
  loading="lazy">
</iframe>`;

const jsonSnippet = `GET ${APP_URL}/api/widgets/trending?topic=side-hustles&count=5`;

export default function WidgetsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
        Free Embeddable Widget
      </h1>
      <p className="mb-8 text-gray-600">
        Show trending, evidence-checked video reviews on your own site —
        free, no signup required. Each item links back to our full analysis.
      </p>

      <section className="mb-10">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          JavaScript widget (recommended)
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          Renders inline wherever you place the script tag.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
          <code>{scriptSnippet}</code>
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          iframe embed
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          Use this if your site strips inline scripts.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
          <code>{iframeSnippet}</code>
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          JSON API
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          For custom integrations. Returns evidence label, risk level, and a
          link to the full review for each video. CORS-enabled.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
          <code>{jsonSnippet}</code>
        </pre>
      </section>

      <section className="mb-10">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          RSS feeds
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          Subscribe in Feedly or any reader — one feed per topic, plus
          site-wide, weekly, high-risk, and strong-evidence feeds.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
          <code>{`${APP_URL}/feed.xml`}</code>
        </pre>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Available topic slugs
        </h2>
        <div className="flex flex-wrap gap-2">
          {TOPIC_SEEDS.map((t) => (
            <span
              key={t.slug}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
            >
              {t.slug}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
