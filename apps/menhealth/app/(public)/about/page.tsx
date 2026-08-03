import type { Metadata } from "next";
import { Disclaimer } from "@menhealth/ui";
export const metadata: Metadata = {
  title: "About Us",
  description:
    "Why MenHealth Digest exists, what we do, and how we approach men's health content.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
        About MenHealth Digest
      </h1>
      <p className="mb-8 text-lg leading-relaxed text-gray-600">
        We help men cut through the noise in online health content — without
        replacing their doctor.
      </p>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">Why we exist</h2>
        <p>
          YouTube is full of men&apos;s health content. Some of it is excellent.
          A lot of it is oversimplified, sensationalised, or financially
          motivated. Distinguishing between the two takes time most people
          don&apos;t have.
        </p>
        <p>
          MenHealth Digest was built to do that work for you. We scan trending
          videos, summarise the key claims in plain English, and label each one
          with an evidence rating — so you can quickly understand what the
          creator is arguing, how well-supported it is, and whether it&apos;s
          worth your time.
        </p>
        <p>
          We are not trying to tell you what to do. We are trying to give you a
          clearer picture of what the evidence actually says.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">What we cover</h2>
        <p>
          We focus on men&apos;s health topics where YouTube content is
          particularly active and where misinformation risk is high:
          testosterone and hormonal health, sleep, fitness over 40, nutrition,
          longevity, mental health, supplements, and sexual health, among
          others.
        </p>
        <p>
          For each topic, we track the most-viewed and fastest-rising content,
          identify the core claims, and rate the quality of evidence behind
          them.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">How we work</h2>
        <p>
          Our pipeline uses AI-assisted summarisation to extract claims from
          videos and generate plain-English summaries. Every summary and claim
          rating is produced using large language models trained on medical and
          scientific literature — but high-risk topics (testosterone, mental
          health, supplements, and others) require human review before
          publishing.
        </p>
        <p>
          We do not host, restream, or download YouTube videos. Every video
          embed on this site is an official YouTube player.
        </p>
        <p>
          Want to know more about how our evidence labels work?{" "}
          <a
            href="/how-we-rate-evidence"
            className="text-emerald-600 hover:underline"
          >
            Read our evidence rating guide →
          </a>
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">Our commitments</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>We will never present AI-generated content as medical advice.</li>
          <li>
            We will always include a health disclaimer on content covering
            clinical topics.
          </li>
          <li>
            We will always disclose affiliate relationships clearly and close to
            the relevant content.
          </li>
          <li>
            We will maintain a human review process for high-risk health claims
            before they are published.
          </li>
        </ul>
      </section>

      <Disclaimer />
    </main>
  );
}
