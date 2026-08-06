import { BrandLogotype as SharedBrandLogotype } from '@menhealth/ui';
import type { CSSProperties } from 'react';

type BrandLogotypeSize = 'sm' | 'md' | 'lg';

interface BrandLogotypeProps {
  className?: string;
  size?: BrandLogotypeSize;
}

const SIZE_STYLES: Record<BrandLogotypeSize, CSSProperties> = {
  sm: {
    '--mh-logo-mark-size': '1.85rem',
    '--mh-logo-wordmark-size': '1.05rem',
  } as CSSProperties,
  md: {
    '--mh-logo-mark-size': '2.35rem',
    '--mh-logo-wordmark-size': '1.35rem',
  } as CSSProperties,
  lg: {
    '--mh-logo-mark-size': '3.35rem',
    '--mh-logo-wordmark-size': '1.85rem',
  } as CSSProperties,
};

export function BrandLogotype({ className, size = 'md' }: BrandLogotypeProps) {
  return (
    <SharedBrandLogotype
      className={className}
      style={SIZE_STYLES[size]}
      ariaLabel="Hype Check"
      mark={
        <svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21 2l3.2 6.6 6.7-3.3-1.6 7.2 7.4 1-5.2 5.4 5.2 5.4-7.4 1 1.6 7.2-6.7-3.3L21 36l-3.2-6.8-6.7 3.3 1.6-7.2-7.4-1 5.2-5.4-5.2-5.4 7.4-1-1.6-7.2 6.7 3.3z"
            className="mh-logotype-mark-burst"
          />
          <path
            d="M14 21l5 5.5L29 14"
            className="mh-logotype-mark-check"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      }
      wordmark="Hype Check"
    />
  );
}
