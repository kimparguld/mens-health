import type { Metadata } from "next";
import { Disclaimer } from "@menhealth/ui";
import { MEDICAL_DISCLAIMER_TEXT } from "@/lib/site-brand";
export const metadata: Metadata = {
  title: "Medical Disclaimer",
  description:
    "Important information about the nature of MenHealth Digest content and its limitations.",
};

export default function MedicalDisclaimerPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
        Medical disclaimer
      </h1>
      <p className="mb-8 text-lg leading-relaxed text-gray-600">
        Please read this carefully before acting on any content you read here.
      </p>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          This is not medical advice
        </h2>
        <p>
          MenHealth Digest provides summaries and evidence ratings of publicly
          available YouTube videos for informational and educational purposes
          only. Nothing on this website constitutes medical advice, diagnosis,
          or treatment.
        </p>
        <p>
          The summaries, claim ratings, takeaways, and evidence labels published
          on this site are generated with AI assistance and reviewed
          editorially. They are not produced by licensed physicians, registered
          dietitians, or other healthcare professionals acting in a clinical
          capacity.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          Always consult a qualified professional
        </h2>
        <p>
          Before making any changes to your diet, exercise routine,
          supplementation, or medical treatment — particularly regarding
          hormones, medications, or mental health — always speak with a licensed
          healthcare professional who can evaluate your individual
          circumstances.
        </p>
        <p>
          If you are experiencing a medical emergency, call your local emergency
          services immediately.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          Accuracy and currency of information
        </h2>
        <p>
          Medical and nutritional science evolves rapidly. Information on this
          site may become outdated. We make reasonable efforts to keep content
          current but cannot guarantee that every summary reflects the latest
          research. Evidence ratings are reviewed periodically but are not
          updated in real time.
        </p>
        <p>
          MenHealth Digest is not responsible for any actions taken based on the
          content of this website, or for any consequences arising from reliance
          on information presented here.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          Third-party content
        </h2>
        <p>
          The videos embedded on this site are produced by third-party YouTube
          creators. MenHealth Digest does not endorse the views, claims, or
          advice of any individual creator. Summaries and evidence ratings
          represent our independent editorial assessment, not the creator&apos;s
          own statements.
        </p>
      </section>

      <Disclaimer text={MEDICAL_DISCLAIMER_TEXT} />
    </main>
  );
}
