'use client';

import { Suspense, useState } from 'react';

type Props = {
  text: string;
  className?: string;
};

function _Disclaimer({ text, className }: Props) {
  const [visible, setVisible] = useState<boolean>(true);
  return (
    visible && (
      <div
        className={`rounded-lg border border-amber-200 bg-amber-50 px-4 flex py-3 text-sm text-amber-900${className ? ` ${className}` : ''}`}
        role="alert"
      >
        <p>{text}</p>
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

export function Disclaimer({ text, className }: Props) {
  return (
    <Suspense fallback={null}>
      <_Disclaimer text={text} className={className} />
    </Suspense>
  );
}
