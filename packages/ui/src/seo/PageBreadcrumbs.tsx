import { buildBreadcrumbSchema } from '@menhealth/core-seo';
import { Breadcrumbs } from './Breadcrumbs';
import { JsonLd } from './JsonLd';

export type BreadcrumbTrailItem = {
  label: string;
  href: string;
};

type Props = {
  baseUrl: string;
  trail: BreadcrumbTrailItem[];
};

export function PageBreadcrumbs({ baseUrl, trail }: Props) {
  const schema = buildBreadcrumbSchema([
    { name: 'Home', url: baseUrl },
    ...trail.map((item) => ({
      name: item.label,
      url: `${baseUrl}${item.href}`,
    })),
  ]);

  const visibleItems = trail.map((item, index) => (index === trail.length - 1 ? { label: item.label } : item));

  return (
    <>
      <JsonLd schema={schema} />
      <Breadcrumbs items={visibleItems} baseUrl={baseUrl} />
    </>
  );
}
