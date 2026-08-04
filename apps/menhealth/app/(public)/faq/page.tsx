import type { Metadata } from "next";
import Link from "next/link";
import { TOPIC_SEEDS } from "@/lib/youtube/topics";
import { getAllTopicSeo } from "@/lib/seo/topic-faq";
import { JsonLd, Disclaimer } from "@menhealth/ui";
import { buildBreadcrumbSchema, buildFaqSchema } from "@menhealth/core-seo";
import type { FaqEntry } from "@menhealth/core-seo";
import { MEDICAL_DISCLAIMER_TEXT } from "@/lib/site-brand";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.menhealth-digest.com";

export const metadata: Metadata = {
  title: "Men's Health FAQ — Common Questions, Answered With Evidence",
  description:
    "Answers to the most common questions about testosterone, sleep, muscle gain, longevity, and more — every answer graded by the strength of its evidence.",
  alternates: { canonical: `${APP_URL}/faq` },
  openGraph: {
    title: "Men's Health FAQ — Common Questions, Answered With Evidence",
    description:
      "Answers to the most common questions about testosterone, sleep, muscle gain, longevity, and more.",
    url: `${APP_URL}/faq`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Men's Health FAQ",
  },
};

export default function FaqPage() {
  const allTopicSeo = getAllTopicSeo();

  const sections = TOPIC_SEEDS.map((topic) => ({
    topic,
    faq: allTopicSeo[topic.slug]?.faq ?? [],
  })).filter((s) => s.faq.length > 0);

  const allFaqs: FaqEntry[] = sections.flatMap((s) => s.faq);

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: APP_URL },
    { name: "FAQ", url: `${APP_URL}/faq` },
  ]);
  const faqSchema = buildFaqSchema(allFaqs);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd schema={[breadcrumbSchema, faqSchema]} />

      <nav className="mb-3 text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        / <span className="text-gray-900">FAQ</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900">
          Frequently Asked Questions
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-gray-600">
          Straight answers to the questions we see most, organised by topic.
          Every claim on this site is graded by the strength of its
          supporting evidence — see{" "}
          <Link href="/how-we-rate-evidence" className="text-emerald-700 hover:underline">
            how we rate evidence
          </Link>
          .
        </p>
      </header>

      <nav className="mb-10 flex flex-wrap gap-2" aria-label="Jump to topic">
        {sections.map(({ topic }) => (
          <a
            key={topic.slug}
            href={`#${topic.slug}`}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
          >
            {topic.name}
          </a>
        ))}
      </nav>

      {sections.map(({ topic, faq }) => (
        <section key={topic.slug} id={topic.slug} className="mb-10 scroll-mt-20">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            <Link
              href={`/topics/${topic.slug}`}
              className="hover:text-emerald-700 hover:underline"
            >
              {topic.name}
            </Link>
          </h2>
          <div className="divide-y rounded-xl border bg-white">
            {faq.map((item, i) => (
              <details key={i} className="group px-5 py-4">
                <summary className="cursor-pointer list-none text-base font-medium text-gray-900 group-open:text-emerald-700">
                  <span className="mr-2 inline-block transition-transform group-open:rotate-90">
                    ›
                  </span>
                  {item.question}
                </summary>
                <p className="mt-3 pl-5 text-sm leading-relaxed text-gray-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ))}

      <Disclaimer text={MEDICAL_DISCLAIMER_TEXT} />
    </main>
  );
}
