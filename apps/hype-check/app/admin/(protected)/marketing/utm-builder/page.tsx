'use client';

import { useState } from 'react';

type UtmField = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  destinationUrl: string;
};

const PRESET_SOURCES = [
  { label: 'Google (CPC)', source: 'google', medium: 'cpc' },
  { label: 'Reddit', source: 'reddit', medium: 'post' },
  { label: 'Twitter / X', source: 'x', medium: 'post' },
  { label: 'TikTok', source: 'tiktok', medium: 'video' },
  { label: 'Newsletter', source: 'newsletter', medium: 'email' },
  { label: 'YouTube Community', source: 'youtube', medium: 'community' },
];

function buildUtmUrl(fields: UtmField): string {
  const base = fields.destinationUrl.trim();
  if (!base) return '';
  const url = new URL(base.startsWith('http') ? base : `https://${base}`);
  if (fields.source) url.searchParams.set('utm_source', fields.source);
  if (fields.medium) url.searchParams.set('utm_medium', fields.medium);
  if (fields.campaign) url.searchParams.set('utm_campaign', fields.campaign);
  if (fields.content) url.searchParams.set('utm_content', fields.content);
  if (fields.term) url.searchParams.set('utm_term', fields.term);
  return url.toString();
}

export default function UtmBuilderPage() {
  const [fields, setFields] = useState<UtmField>({
    source: '',
    medium: '',
    campaign: '',
    content: '',
    term: '',
    destinationUrl: 'https://hype-check.net/newsletter',
  });
  const [copied, setCopied] = useState(false);

  const utmUrl = buildUtmUrl(fields);

  function applyPreset(preset: { source: string; medium: string }) {
    setFields((f) => ({ ...f, source: preset.source, medium: preset.medium }));
  }

  function set(key: keyof UtmField) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }));
  }

  async function copyUrl() {
    if (!utmUrl) return;
    await navigator.clipboard.writeText(utmUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">UTM Builder</h1>
      <p className="mb-6 text-sm text-gray-500">
        Build UTM-tagged campaign links for tracking traffic sources.
      </p>

      {/* Presets */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold text-gray-500">
          Quick presets
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_SOURCES.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="hover:border-ink-muted/40 hover:text-ink-muted/80 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {(
          [
            {
              key: 'destinationUrl',
              label: 'Destination URL',
              placeholder: 'https://hype-check.net/newsletter',
            },
            {
              key: 'source',
              label: 'utm_source',
              placeholder: 'google, reddit, newsletter…',
            },
            {
              key: 'medium',
              label: 'utm_medium',
              placeholder: 'cpc, email, post, video…',
            },
            {
              key: 'campaign',
              label: 'utm_campaign',
              placeholder: 'mens_health_digest, claim_check…',
            },
            {
              key: 'content',
              label: 'utm_content (optional)',
              placeholder: 'ad variant or post identifier',
            },
            {
              key: 'term',
              label: 'utm_term (optional)',
              placeholder: 'paid keyword if applicable',
            },
          ] as { key: keyof UtmField; label: string; placeholder: string }[]
        ).map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {label}
            </label>
            <input
              type="text"
              value={fields[key]}
              onChange={set(key)}
              placeholder={placeholder}
              className="focus:border-ink-muted/50 focus:ring-ink-muted/50 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:outline-none"
            />
          </div>
        ))}
      </div>

      {utmUrl && (
        <div className="mt-8">
          <p className="mb-1 text-xs font-semibold text-gray-700">
            Generated UTM URL
          </p>
          <div className="border-ink-muted/20 flex items-center gap-2 rounded-lg border bg-indigo-50 p-3">
            <code className="text-ink-muted/90 min-w-0 flex-1 text-xs break-all">
              {utmUrl}
            </code>
            <button
              onClick={copyUrl}
              className="bg-ink-muted/70 hover:bg-ink-muted/80 flex-shrink-0 rounded px-3 py-1.5 text-xs font-semibold text-white"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
