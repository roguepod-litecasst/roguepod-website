/**
 * Fetches the Acast RSS feed at build time and writes public/episodes.json.
 *
 * The feed sends no CORS headers, so the browser can't read it directly — we
 * snapshot it here instead. The site rebuilds whenever the tier list workflow
 * runs, so the snapshot refreshes on roughly the same cadence as new episodes.
 *
 * If the fetch fails (offline dev, feed hiccup in CI) the existing
 * episodes.json is left untouched rather than failing the build.
 */

const fs = require('fs');
const path = require('path');

const FEED_URL = 'https://feeds.acast.com/public/shows/roguepod-litecast';
const OUTPUT_FILE = path.join(__dirname, '../public/episodes.json');
const MAX_EPISODES = 12;

/** Boilerplate the hosts append to every episode description. */
const BOILERPLATE = [
  /please fill out the listener feedback survey/i,
  /join the roguepod litecast discord/i,
  /check out the full tier list/i,
  /join the roguepod litecast patreon/i,
  /hosted on acast/i,
  /^https?:\/\//i,
];

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

// The `(?:\s[^>]*)?` guard matters: without it, a lookup for `itunes:episode`
// also matches the `itunes:episodeType` element that precedes it in the feed.
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]).trim() : '';
};

const attr = (xml, name, attribute) => {
  const m = xml.match(new RegExp(`<${name}[^>]*\\b${attribute}="([^"]*)"`, 'i'));
  return m ? decode(m[1]).trim() : '';
};

/** First real sentence of the description, with the standing boilerplate removed. */
const blurb = (descriptionHtml) => {
  const paragraphs = decode(descriptionHtml)
    .split(/<\/p>|<br\s*\/?>|<hr\s*\/?>/i)
    .map((p) => p.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((p) => !BOILERPLATE.some((re) => re.test(p)));
  return paragraphs[0] || '';
};

/** "1:47:52" -> "1h 48m", "42:10" -> "42m" */
const humanDuration = (raw) => {
  if (!raw) return '';
  const parts = raw.split(':').map(Number);
  if (parts.some(Number.isNaN)) return '';
  const seconds =
    parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts.length === 2
        ? parts[0] * 60 + parts[1]
        : parts[0];
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
};

/**
 * Bonus episodes don't get a tier and shouldn't count toward the game total.
 * Most are tagged <itunes:episodeType>bonus</itunes:episodeType>, but at least
 * one ("Bonus: Roguelikes, Roguelites, and Metaprogression") is tagged `full`,
 * so we check the title too.
 */
const isBonus = (episodeType, title) =>
  episodeType === 'bonus' || episodeType === 'trailer' || /^bonus\s*[:\-]/i.test(title);

const slugify = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Game art comes from the tier list pipeline's Steam capsule cache, exported to
 * public/episode-art/ by scripts/export_episode_art.py. A brand new episode may
 * not have art yet, in which case the card falls back to a typographic layout.
 */
const artFor = (title) => {
  const file = `${slugify(title)}.webp`;
  return fs.existsSync(path.join(__dirname, '../public/episode-art', file))
    ? `/episode-art/${file}`
    : null;
};

async function main() {
  let xml;
  try {
    const response = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'roguepod.show build script' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    xml = await response.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (fs.existsSync(OUTPUT_FILE)) {
      console.warn(`⚠ Could not fetch feed (${message}) — keeping existing episodes.json`);
      return;
    }
    console.warn(`⚠ Could not fetch feed (${message}) — writing empty episodes.json`);
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify({ generatedAt: new Date().toISOString(), episodeCount: 0, episodes: [] }, null, 2)
    );
    return;
  }

  const now = Date.now();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  const parsed = items
    .map((item) => {
      const title = tag(item, 'title');
      const episodeType = tag(item, 'itunes:episodeType').toLowerCase();
      const publishedAt = tag(item, 'pubDate');
      return {
        title,
        bonus: isBonus(episodeType, title),
        publishedAt,
        publishedMs: Date.parse(publishedAt),
        number: Number(tag(item, 'itunes:episode')) || null,
        duration: humanDuration(tag(item, 'itunes:duration')),
        link: tag(item, 'link'),
        art: artFor(title),
        blurb: blurb(tag(item, 'description')),
      };
    })
    // Scheduled-but-unreleased items shouldn't appear or be counted.
    .filter((ep) => !Number.isNaN(ep.publishedMs) && ep.publishedMs <= now)
    .sort((a, b) => b.publishedMs - a.publishedMs);

  const games = parsed.filter((ep) => !ep.bonus);

  const payload = {
    generatedAt: new Date().toISOString(),
    // Game episodes only — bonus episodes aren't reviews and get no tier.
    episodeCount: games.length,
    episodes: games.slice(0, MAX_EPISODES).map(({ bonus, publishedMs, ...ep }) => ep),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));
  console.log(
    `Fetched ${parsed.length} released items → ${games.length} game episodes ` +
      `(${parsed.length - games.length} bonus excluded), wrote ${payload.episodes.length} to episodes.json`
  );
}

main();
