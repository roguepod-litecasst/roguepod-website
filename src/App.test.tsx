import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

const EPISODE = {
  slug: 'everything-is-crab',
  title: 'Everything is Crab',
  publishedAt: 'Wed, 22 Jul 2026 09:00:00 GMT',
  number: 47,
  duration: '1h 48m',
  link: 'https://shows.acast.com/roguepod-litecast/episodes/abc123',
  embed: 'https://embed.acast.com/show/abc123',
  audio: 'https://sphinx.acast.com/media.mp3',
  apple: 'https://podcasts.apple.com/us/podcast/everything-is-crab/id1774367401?i=1',
  art: '/episode-art/everything-is-crab.webp',
  share: '/episode-share/everything-is-crab.jpg',
  blurb: 'This week we play Everything is Crab.',
  blocks: [{ text: 'This week we play Everything is Crab.', list: false }],
};

beforeEach(() => {
  // The home page reads the build-time feed snapshot.
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      generatedAt: '2026-07-22T00:00:00.000Z',
      episodeCount: 47,
      episodes: [EPISODE],
    }),
  }) as unknown as typeof fetch;
});

test('home page shows the show tagline and a link to the tier list', async () => {
  renderAt('/');

  expect(
    screen.getByText(/Building the most comprehensive roguelite tier list/i)
  ).toBeInTheDocument();

  // The tier list section must keep the #tierlist anchor that existing links use.
  await waitFor(() => {
    expect(document.getElementById('tierlist')).toBeInTheDocument();
  });
});

test('home page renders episodes from the feed snapshot', async () => {
  renderAt('/');

  expect(await screen.findByText('Everything is Crab')).toBeInTheDocument();
  expect(screen.getByText(/47 games reviewed/i)).toBeInTheDocument();
});

test('the tier list image keeps its required path', async () => {
  renderAt('/');

  await waitFor(() => {
    const images = Array.from(document.querySelectorAll('img'));
    // A Discord bot polls https://roguepod.show/tierlist.png — do not move it.
    expect(images.some((img) => img.getAttribute('src') === '/tierlist.png')).toBe(true);
  });
});

test('episode cards link to the on-site episode page, not off-site', async () => {
  renderAt('/');

  const card = await screen.findByRole('link', { name: /Everything is Crab/i });
  expect(card).toHaveAttribute('href', '/episodes/everything-is-crab');
});

test('the episode page shows the player and a per-episode Apple link', async () => {
  renderAt('/episodes/everything-is-crab');

  expect(await screen.findByRole('heading', { name: 'Everything is Crab' })).toBeInTheDocument();

  // Scoped to the article: the footer carries a show-level Apple link too.
  const article = within(screen.getByRole('article'));
  // Per-episode, not the show-level Apple URL.
  expect(article.getByRole('link', { name: /Apple Podcasts/i })).toHaveAttribute(
    'href',
    EPISODE.apple
  );

  const player = document.querySelector('iframe');
  expect(player).toHaveAttribute('src', EPISODE.embed);

  expect(screen.getByText(EPISODE.blurb)).toBeInTheDocument();
});

test('an unknown episode slug renders a not-found state', async () => {
  renderAt('/episodes/does-not-exist');

  expect(await screen.findByRole('heading', { name: /Episode not found/i })).toBeInTheDocument();
});

test('the episode index lists every episode', async () => {
  renderAt('/episodes');

  expect(await screen.findByRole('heading', { name: /All episodes/i })).toBeInTheDocument();
  // Count renders only once the snapshot has loaded.
  expect(await screen.findByText(/47 total/i)).toBeInTheDocument();
});
