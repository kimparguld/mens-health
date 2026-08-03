'use client';

import { Suspense, useState } from 'react';

type Props = {
  className?: string;
};

function _Disclaimer({ className }: Props) {
  const [visible, setVisible] = useState<boolean>(true);
  return (
    visible && (
      <div
        className={`rounded-lg border border-amber-200 bg-amber-50 px-4 flex py-3 text-sm text-amber-900${className ? ` ${className}` : ''}`}
        role="alert"
      >
        <p>
          <strong>Educational content only.</strong> This page summarizes publicly available video content for
          informational purposes. It is not medical advice. Always speak with a licensed healthcare professional before
          making any medical decisions.
        </p>
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss disclaimer"
          className="text-amber-600 hover:text-amber-900 flex ml-4"
        >
          ✕
        </button>
      </div>
    )
  );
}

export function Disclaimer({ className }: Props) {
  return (
    <Suspense fallback={null}>
      <_Disclaimer className={className} />
    </Suspense>
  );
}
