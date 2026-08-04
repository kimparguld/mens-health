import { useId, type CSSProperties } from 'react';

type BrandLogotypeSize = 'sm' | 'md';

interface BrandLogotypeProps {
  className?: string;
  size?: BrandLogotypeSize;
}

const SIZE_STYLES: Record<BrandLogotypeSize, CSSProperties> = {
  sm: {
    '--mh-logo-mark-size': '2rem',
    '--mh-logo-wordmark-height': '2rem',
    '--mh-logo-top-size': '0.58rem',
    '--mh-logo-bottom-size': '1.06rem',
  } as CSSProperties,
  md: {
    '--mh-logo-mark-size': '2.45rem',
    '--mh-logo-wordmark-height': '2.45rem',
    '--mh-logo-top-size': '0.66rem',
    '--mh-logo-bottom-size': '1.2rem',
  } as CSSProperties,
};

export function BrandLogotype({ className = '', size = 'md' }: BrandLogotypeProps) {
  const gradientId = useId();

  return (
    <span
      className={`mh-logotype ${className}`.trim()}
      style={SIZE_STYLES[size]}
      aria-label="Hype Check"
    >
      <span className="mh-logotype-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={gradientId} x1="6" y1="8" x2="58" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#4338ca" />
            </linearGradient>
          </defs>
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            className="mh-logotype-mark-bg"
            style={{ fill: `url(#${gradientId})` }}
          />
          <path
            d="M32 14L44 20V32C44 40 38.4 47.1 32 49.5C25.6 47.1 20 40 20 32V20L32 14Z"
            className="mh-logotype-mark-shield"
          />
          <path
            d="M23 32L29 38L41 24"
            className="mh-logotype-mark-wave"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <span className="mh-logotype-wordmark" aria-hidden="true">
        <span className="mh-logotype-top">HYPE</span>
        <span className="mh-logotype-bottom">Check</span>
      </span>
    </span>
  );
}