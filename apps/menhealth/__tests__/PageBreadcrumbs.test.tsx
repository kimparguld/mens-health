import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageBreadcrumbs } from '@menhealth/ui';

describe('PageBreadcrumbs', () => {
  const baseUrl = 'https://example.com';

  it('renders Home plus every trail item as visible nav text', () => {
    render(
      <PageBreadcrumbs
        baseUrl={baseUrl}
        trail={[
          { label: 'Topics', href: '/topics' },
          { label: 'Testosterone', href: '/topics/testosterone' },
        ]}
      />
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Topics')).toBeInTheDocument();
    expect(screen.getByText('Testosterone')).toBeInTheDocument();
  });

  it('does not render the last trail item as a link', () => {
    render(
      <PageBreadcrumbs
        baseUrl={baseUrl}
        trail={[
          { label: 'Topics', href: '/topics' },
          { label: 'Testosterone', href: '/topics/testosterone' },
        ]}
      />
    );
    expect(screen.getByText('Topics').closest('a')).not.toBeNull();
    expect(screen.getByText('Testosterone').closest('a')).toBeNull();
  });

  it('emits a JSON-LD BreadcrumbList whose entries exactly match the visible trail', () => {
    const { container } = render(
      <PageBreadcrumbs
        baseUrl={baseUrl}
        trail={[
          { label: 'Claims', href: '/claims' },
          { label: 'Some claim text', href: '/claims/some-claim' },
        ]}
      />
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const schema = JSON.parse(script?.innerHTML ?? '{}') as {
      '@type': string;
      itemListElement: Array<{ position: number; name: string; item: string }>;
    };
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Claims',
        item: `${baseUrl}/claims`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Some claim text',
        item: `${baseUrl}/claims/some-claim`,
      },
    ]);
  });
});
