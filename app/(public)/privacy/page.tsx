import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How MenHealth Digest collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
        Privacy policy
      </h1>
      <p className="mb-2 text-sm text-gray-500">Last updated: July 2026</p>
      <p className="mb-8 text-lg leading-relaxed text-gray-600">
        We collect as little data as possible and are transparent about what we
        do use.
      </p>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          What data we collect
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Newsletter subscribers:</strong> Your email address, stored
            via Resend, our email service provider. We do not store this in our
            own database.
          </li>
          <li>
            <strong>Registered users:</strong> If you create an account, we
            store your email address and authentication credentials (via
            Auth.js). Passwords are never stored in plain text.
          </li>
          <li>
            <strong>Payment data:</strong> If you subscribe to a premium plan,
            payment is handled entirely by Stripe. We do not store card details.
            We receive a subscription status from Stripe to enable premium
            features.
          </li>
          <li>
            <strong>Usage analytics:</strong> We may collect anonymised,
            aggregated usage data (page views, referrer) to understand which
            content is most useful. This data does not contain personally
            identifiable information.
          </li>
        </ul>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          How we use your data
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>To send you the newsletter digest (if subscribed)</li>
          <li>To manage your account and premium subscription</li>
          <li>To improve the quality and relevance of content</li>
        </ul>
        <p>We do not sell your personal data to third parties.</p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">
          Third-party services
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>YouTube:</strong> Video embeds on this site load content
            from YouTube&apos;s servers. YouTube&apos;s own privacy policy
            applies to these embeds.
          </li>
          <li>
            <strong>Resend:</strong> Used for newsletter delivery. Your email
            address is transferred to Resend to send digest emails.
          </li>
          <li>
            <strong>Stripe:</strong> Used for payment processing. Stripe&apos;s
            privacy policy applies to payment transactions.
          </li>
        </ul>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">Cookies</h2>
        <p>
          We use session cookies to maintain authentication state for logged-in
          users. We do not use advertising or tracking cookies.
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">Your rights</h2>
        <p>
          You can unsubscribe from the newsletter at any time using the
          unsubscribe link in any digest email. To request deletion of your
          account or personal data,{" "}
          <a href="/contact" className="text-emerald-600 hover:underline">
            contact us
          </a>
          .
        </p>
      </section>

      <section className="mb-10 space-y-4 leading-relaxed text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">Contact</h2>
        <p>
          If you have questions about how we handle your data, please{" "}
          <a href="/contact" className="text-emerald-600 hover:underline">
            get in touch
          </a>
          .
        </p>
      </section>
    </main>
  );
}
