/**
 * Fetches the Acast RSS feed at build time and writes public/episodes.json.
 *
 * The feed sends no CORS headers, so the browser can't read it directly — we
 * snapshot it here instead. The site rebuilds whenever the tier list workflow
 * runs, so the snapshot refreshes on roughly the same cadence as new episodes.
 *
 * Also resolves a per-episode Apple Podcasts URL via the iTunes Lookup API,
 * matched on the feed's GUID. That's used on the individual episode pages.
 *
 * If the fetch fails (offline dev, feed hiccup in CI) the existing
 * episodes.json is left untouched rather than failing the build.
 */

const fs = require('fs');
const path = require('path');

const FEED_URL = 'https://feeds.acast.com/public/shows/roguepod-litecast';
const ACAST_SHOW_ID = '670c223adf4dd6f896322012';
const APPLE_ID = '1774367401';
const APPLE_LOOKUP = `https://itunes.apple.com/lookup?id=${APPLE_ID}&entity=podcastEpisode&limit=200`;
const OUTPUT_FILE = path.join(__dirname, '../public/episodes.json');

/** Boilerplate the hosts append to every episode description. */
const BOILERPLATE = [
  /please fill out the listener feedback survey/i,
  /join the roguepod litecast discord/i,
  /check out the full tier list/i,
  /look at the whole tier list/i,
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

/**
 * Description split into plain-text blocks with the standing boilerplate
 * removed. Plain text rather than HTML so the page never needs to inject markup
 * it didn't author.
 *
 * Splitting has to include list tags, not just <p>/<br>: some episodes carry a
 * CORRECTIONS list, and without </li> as a boundary the whole <ul> merges into
 * the Patreon paragraph that follows it and gets filtered out with it.
 */
const describe = (descriptionHtml) => {
  const html = decode(descriptionHtml);
  const blocks = [];

  for (const raw of html.split(/(?=<li\b)|<\/p>|<\/li>|<\/?ul>|<\/?ol>|<br\s*\/?>|<hr\s*\/?>/i)) {
    if (!raw) continue;
    const list = /^<li\b/i.test(raw.trim());
    const text = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (BOILERPLATE.some((re) => re.test(text))) continue;
    blocks.push({ text, list });
  }

  return blocks;
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

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Game art comes from the tier list pipeline's Steam capsule cache, exported to
 * public/episode-art/ by scripts/export_episode_art.py. A brand new episode may
 * not have art yet, in which case the card falls back to a typographic layout.
 */
const assetFor = (dir, slug, ext) => {
  const file = `${slug}.${ext}`;
  return fs.existsSync(path.join(__dirname, '../public', dir, file))
    ? `/${dir}/${file}`
    : null;
};

/**
 * Per-episode Apple Podcasts URLs, keyed by the feed GUID. Best-effort: if the
 * lookup fails, episode pages fall back to the show-level Apple link.
 */
async function fetchAppleUrls() {
  try {
    const response = await fetch(APPLE_LOOKUP, {
      headers: { 'User-Agent': 'roguepod.show build script' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const byGuid = {};
    for (const result of data.results || []) {
      if (result.episodeGuid && result.trackViewUrl) {
        // Strip Apple's affiliate/tracking suffix.
        byGuid[result.episodeGuid] = result.trackViewUrl.replace(/[?&]uo=\d+$/, '');
      }
    }
    console.log(`Resolved ${Object.keys(byGuid).length} Apple episode URLs`);
    return byGuid;
  } catch (err) {
    console.warn(`⚠ Apple lookup failed (${err.message}) — using show-level links`);
    return {};
  }
}

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

/** Everything in the snapshot except the timestamp it was written at. */
const sameEpisodes = (a, b) =>
  JSON.stringify({ ...a, generatedAt: null }) === JSON.stringify({ ...b, generatedAt: null });

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

  const appleUrls = await fetchAppleUrls();
  const now = Date.now();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  const parsed = items
    .map((item) => {
      const title = tag(item, 'title');
      const episodeType = tag(item, 'itunes:episodeType').toLowerCase();
      const publishedAt = tag(item, 'pubDate');
      const guid = tag(item, 'guid');
      const blocks = describe(tag(item, 'description'));
      const slug = slugify(title);

      /*
       * Lead the description with "A Podcast Review of <Game>: ..." for search.
       * Applied here rather than in the page so the rendered copy, the meta
       * description and the og:description are always the same string.
       */
      const firstProse = blocks.find((b) => !b.list);
      if (firstProse) {
        // Strip the older "<Game> podcast:" lead-in first, so a feed or
        // snapshot still carrying it doesn't end up with both.
        firstProse.text = firstProse.text.replace(
          new RegExp(`^${escapeRegExp(title)}\\s+podcast:\\s*`, 'i'),
          ''
        );
        if (!new RegExp(`^A Podcast Review of ${escapeRegExp(title)}:`, 'i').test(firstProse.text)) {
          firstProse.text = `A Podcast Review of ${title}: ${firstProse.text}`;
        }
      }

      return {
        slug,
        title,
        bonus: isBonus(episodeType, title),
        publishedAt,
        publishedMs: Date.parse(publishedAt),
        number: Number(tag(item, 'itunes:episode')) || null,
        duration: humanDuration(tag(item, 'itunes:duration')),
        link: tag(item, 'link'),
        // Acast's per-episode player. The GUID doubles as the episode id.
        embed: guid ? `https://embed.acast.com/${ACAST_SHOW_ID}/${guid}` : null,
        audio: attr(item, 'enclosure', 'url'),
        apple: appleUrls[guid] || null,
        art: assetFor('episode-art', slug, 'webp'),
        share: assetFor('episode-share', slug, 'jpg'),
        blurb: firstProse ? firstProse.text : '',
        blocks,
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
    episodes: games.map(({ bonus, publishedMs, ...ep }) => ep),
  };

  /*
   * Keep the previous timestamp when nothing else moved. Otherwise every
   * `npm start` and every CI run rewrites this file, so `git status` can't be
   * used to answer "did a new episode land?" — the deploy check in
   * .github/workflows/update-tierlist.yml relies on that being a real signal,
   * and a stale timestamp diff is what leaves an uncommitted episodes.json
   * sitting in the working tree after local development.
   */
  const previous = readJson(OUTPUT_FILE);
  if (previous && sameEpisodes(previous, payload)) {
    payload.generatedAt = previous.generatedAt;
  }

  const serialised = JSON.stringify(payload, null, 2);
  if (previous && serialised === JSON.stringify(previous, null, 2)) {
    console.log(`Episode data unchanged (${games.length} game episodes)`);
    return;
  }

  fs.writeFileSync(OUTPUT_FILE, serialised);
  console.log(
    `Fetched ${parsed.length} released items → ${games.length} game episodes ` +
      `(${parsed.length - games.length} bonus excluded), ` +
      `${payload.episodes.filter((e) => e.apple).length} with Apple links`
  );
}

main();
