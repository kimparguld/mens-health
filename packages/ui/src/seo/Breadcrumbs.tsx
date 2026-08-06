import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
  baseUrl?: string;
};

export function Breadcrumbs({ items, baseUrl }: Props) {
  let labelClass = 'text-emerald-600';

  if (baseUrl?.includes('hype-check')) {
    labelClass = 'text-accent';
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
        <li>
          <Link href="/" className="hover:text-gray-900">
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={item.label + i} className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            {item.href ? (
              <Link href={item.href} className="hover:text-gray-900">
                {item.label}
              </Link>
            ) : (
              <span className={twMerge('font-medium', labelClass)} aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
