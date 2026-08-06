import type { CSSProperties, ReactNode } from 'react';

export interface BrandLogotypeProps {
  className?: string;
  style?: CSSProperties;
  ariaLabel: string;
  mark: ReactNode;
  wordmark: ReactNode;
}

export function BrandLogotype({ className = '', style, ariaLabel, mark, wordmark }: BrandLogotypeProps) {
  return (
    <span className={`mh-logotype ${className}`.trim()} style={style} aria-label={ariaLabel}>
      <span className="mh-logotype-mark" aria-hidden="true">
        {mark}
      </span>
      <span className="mh-logotype-wordmark" aria-hidden="true">
        {wordmark}
      </span>
    </span>
  );
}
