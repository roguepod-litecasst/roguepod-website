import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

beforeEach(() => {
  // The home page reads the build-time feed snapshot.
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      generatedAt: '2026-07-22T00:00:00.000Z',
      episodeCount: 47,
      episodes: [
        {
          title: 'Everything is Crab',
          publishedAt: 'Wed, 22 Jul 2026 09:00:00 GMT',
          number: 47,
          duration: '1h 48m',
          link: 'https://example.test/ep',
          art: '/episode-art/everything-is-crab.webp',
          blurb: 'This week we play Everything is Crab.',
        },
      ],
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
