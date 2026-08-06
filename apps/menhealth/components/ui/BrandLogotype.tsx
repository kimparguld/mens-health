import { BrandLogotype as SharedBrandLogotype } from '@menhealth/ui';
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

export function BrandLogotype({ className, size = 'md' }: BrandLogotypeProps) {
  const gradientId = useId();

  return (
    <SharedBrandLogotype
      className={className}
      style={SIZE_STYLES[size]}
      ariaLabel="MenHealth Digest"
      mark={
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={gradientId} x1="6" y1="8" x2="58" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#14b8a6" />
              <stop offset="1" stopColor="#047857" />
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
            d="M11 37H21L26 28L33 42L38 34H53"
            className="mh-logotype-mark-wave"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M32 14L44 20V32C44 40 38.4 47.1 32 49.5C25.6 47.1 20 40 20 32V20L32 14Z"
            className="mh-logotype-mark-shield"
          />
        </svg>
      }
      wordmark={
        <>
          <span className="mh-logotype-top">MENHEALTH</span>
          <span className="mh-logotype-bottom">Digest</span>
        </>
      }
    />
  );
}
