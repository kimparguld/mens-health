import { createMetadata } from '@/lib/seo/site-metadata';
import { PageBreadcrumbs } from '@menhealth/ui';
import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.hype-check.net';

export const metadata: Metadata = createMetadata({
  title: 'Contact',
  description: 'Get in touch with Hype Check.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <PageBreadcrumbs
        baseUrl={APP_URL}
        trail={[{ label: 'Contact', href: '/contact' }]}
      />
      <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900">
        Contact us
      </h1>
      <p className="mb-8 text-lg leading-relaxed text-gray-600">
        Questions, corrections, feedback, or partnership enquiries — we want to
        hear from you.
      </p>

      <section className="mb-10 space-y-6 leading-relaxed text-gray-700">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            General enquiries
          </h2>
          <p className="text-sm text-gray-600">
            For anything not listed below, email us at{' '}
            <a
              href="mailto:hello@hype-check.net"
              className="text-muted/60 hover:underline"
            >
              hello@hype-check.net
            </a>
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            Editorial corrections
          </h2>
          <p className="text-sm text-gray-600">
            Found a factual error in a summary or an incorrect evidence rating?
            Email{' '}
            <a
              href="mailto:corrections@hype-check.net"
              className="text-muted/60 hover:underline"
            >
              corrections@hype-check.net
            </a>{' '}
            with the video title and a description of the issue. We aim to
            respond within 3 business days.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            Partnership & sponsorship
          </h2>
          <p className="text-sm text-gray-600">
            For advertising, sponsorship, or affiliate programme enquiries,
            email{' '}
            <a
              href="mailto:partnerships@hype-check.net"
              className="text-muted/60 hover:underline"
            >
              partnerships@hype-check.net
            </a>
            . Please include your brand name and a brief description of what you
            are looking for.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            Data & privacy requests
          </h2>
          <p className="text-sm text-gray-600">
            To request deletion of your personal data or exercise any other data
            rights, email{' '}
            <a
              href="mailto:privacy@hype-check.net"
              className="text-muted/60 hover:underline"
            >
              privacy@hype-check.net
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
