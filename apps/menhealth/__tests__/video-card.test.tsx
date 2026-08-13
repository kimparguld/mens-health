import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VideoCard } from '@menhealth/ui';

const baseProps = {
  slug: 'some-video',
  title: 'Some Video Title',
  channelTitle: 'Some Channel',
  thumbnailUrl: null,
  shortSummary: null,
  trendScore: 1,
};

describe('VideoCard', () => {
  it('renders topic badges as links and never nests an <a> inside another <a>', () => {
    const { container } = render(
      <VideoCard
        {...baseProps}
        topics={[{ name: 'Testosterone', slug: 'testosterone' }]}
      />
    );

    const badgeLink = screen.getByText('Testosterone').closest('a');
    expect(badgeLink).not.toBeNull();
    expect(badgeLink).toHaveAttribute('href', '/topics/testosterone');

    for (const anchor of Array.from(container.querySelectorAll('a'))) {
      expect(anchor.querySelector('a')).toBeNull();
    }
  });

  it('renders a non-link badge when only topicNames is provided (fallback path)', () => {
    render(<VideoCard {...baseProps} topicNames={['Testosterone']} />);

    const badge = screen.getByText('Testosterone');
    expect(badge.closest('a')).toBeNull();
  });
});
