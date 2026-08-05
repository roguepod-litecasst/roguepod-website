/**
 * Generates public/sitemap.xml from the episode snapshot and the blog index.
 *
 * This used to be maintained by hand, which was already easy to forget for blog
 * posts and is unmanageable now that there's a page per episode.
 *
 * Runs as part of `npm run build`, before the CRA build copies public/ across.
 * scripts/validate-sitemap.js runs straight after and fails the build on
 * anything malformed.
 *
 * Two things here are less obvious than they look:
 *
 * 1. **Every URL carries a trailing slash.** GitHub Pages serves a directory's
 *    index.html only at the slashed path and 301s the bare one, so
 *    /episodes/pathogenic redirects to /episodes/pathogenic/. Google treats a
 *    redirecting sitemap URL as an error, so the slashed form — the one that
 *    actually answers 200 — is the canonical form site-wide. prerender.js
 *    writes the matching <link rel="canonical">; the two must not drift.
 *
 * 2. **lastmod comes from a fingerprint ledger**, scripts/sitemap-lastmod.json,
 *    not from the publish date. Publish dates never move, so a corrected show
 *    note or an edited post gave Google no reason to recrawl. The ledger stores
 *    a hash of what each page renders from; when the hash changes the date
 *    advances to the build date, and when it doesn't the stored date is kept.
 *    That file is build state, deliberately outside public/ so it isn't served,
 *    and it's committed so CI and local builds agree.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { readPosts } = require('./blog-posts');

const PUBLIC_DIR = path.join(__dirname, '../public');
const LEDGER_FILE = path.join(__dirname, 'sitemap-lastmod.json');
const SITE_URL = 'https://roguepod.show';
const TODAY = new Date().toISOString().slice(0, 10);

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, file), 'utf8'));
  } catch {
    return fallback;
  }
};

const isoDay = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const fingerprint = (value) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const urlEntry = ({ loc, lastmod }) =>
  [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');

function main() {
  const { episodes = [] } = readJson('episodes.json', {});
  const posts = readPosts();

  const ledger = (() => {
    try {
      return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
    } catch {
      return {};
    }
  })();
  const nextLedger = {};

  /**
   * The stored date if the page renders from identical source, otherwise
   * today. A page we've never seen starts at `seed` — its publish date — so
   * introducing the ledger doesn't stamp the whole back catalogue with the
   * build date.
   */
  const lastmodFor = (loc, source, seed) => {
    const hash = fingerprint(source);
    const previous = ledger[loc];
    let lastmod;
    if (previous && previous.hash === hash) lastmod = previous.lastmod;
    else if (previous) lastmod = TODAY;
    else lastmod = seed || TODAY;

    nextLedger[loc] = { hash, lastmod };
    return lastmod;
  };

  const episodeUrls = episodes.map((episode) => {
    const loc = `${SITE_URL}/episodes/${episode.slug}/`;
    // Everything the episode page renders. Art paths are included so a card
    // gaining share art counts as a change.
    const source = {
      title: episode.title,
      publishedAt: episode.publishedAt,
      number: episode.number,
      duration: episode.duration,
      blurb: episode.blurb,
      blocks: episode.blocks,
      link: episode.link,
      apple: episode.apple,
      audio: episode.audio,
      art: episode.art,
      share: episode.share,
    };
    return { loc, lastmod: lastmodFor(loc, source, isoDay(episode.publishedAt)) };
  });

  const postUrls = posts.map((post) => {
    const loc = `${SITE_URL}/blog/${post.slug}/`;
    return { loc, lastmod: lastmodFor(loc, post.raw, isoDay(post.date)) };
  });

  /**
   * An index page changed when its newest child did. That's a lower bound —
   * it misses layout-only edits — but it's a date we can stand behind, which
   * a wrong lastmod isn't: Google learns to distrust the field site-wide.
   * The homepage gets none at all; nothing here can date the tier list image,
   * the hero and the episode rail together.
   */
  const newestOf = (entries) =>
    entries.map((entry) => entry.lastmod).filter(Boolean).sort().pop() || '';

  const urls = [
    { loc: `${SITE_URL}/` },
    { loc: `${SITE_URL}/episodes/`, lastmod: newestOf(episodeUrls) },
    ...episodeUrls,
  ];

  if (postUrls.length > 0) {
    urls.push({ loc: `${SITE_URL}/blog/`, lastmod: newestOf(postUrls) }, ...postUrls);
  }

  // Belt and braces: a <url> with no <loc> is invalid against the 0.9 schema
  // and a strict parser can reject the whole file over one of them.
  const valid = urls.filter((entry) => {
    if (entry.loc && entry.loc.trim()) return true;
    console.warn('⚠ Dropped a sitemap entry with no loc:', JSON.stringify(entry));
    return false;
  });

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    valid.map(urlEntry).join('\n') +
    '\n</urlset>\n';

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), xml);

  // Only rewrite the ledger when it actually moved. Otherwise every `npm start`
  // dirties the worktree, and the tier list workflow's "did anything change?"
  // check stops being a real signal.
  const serialised = `${JSON.stringify(nextLedger, null, 2)}\n`;
  let existing = '';
  try {
    existing = fs.readFileSync(LEDGER_FILE, 'utf8');
  } catch {
    /* first run */
  }
  if (serialised !== existing) fs.writeFileSync(LEDGER_FILE, serialised);

  console.log(`Generated sitemap with ${valid.length} URLs`);
}

main();
