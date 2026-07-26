type Props = {
  className?: string;
};

export function Disclaimer({ className }: Props) {
  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900${className ? ` ${className}` : ""}`}
    >
      <p>
        <strong>Educational content only.</strong> This page summarizes publicly
        available video content for informational purposes. It is not medical
        advice. Always speak with a licensed healthcare professional before
        making any medical decisions.
      </p>
    </div>
  );
}
