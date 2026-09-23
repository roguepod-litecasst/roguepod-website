/**
 * Renders every route to a real HTML file after the CRA build: the home page,
 * /episodes/ and each episode, /tier-list/, /roguelite-vs-roguelike/, /blog/
 * and each post.
 *
 * Reddit, Discord, Slack and search crawlers don't run JavaScript, and Google
 * only runs it later, in a second pass it schedules by how valuable the page
 * looks from its raw HTML. So the raw HTML has to be the page: its own <title>,
 * meta description, Open Graph and Twitter tags, canonical URL and schema.org
 * JSON-LD in the head, and the React app's own markup — header nav, content,
 * links to other episodes, footer — in #root.
 *
 * That markup comes from rendering the app itself (src/ssr.tsx, bundled by
 * ssr-bundle.js) with the page's data preloaded, not from a hand-written copy.
 * It used to be a hand-written copy: a few lines per page with no links to any
 * other page, while the real links only existed after JavaScript ran. Google
 * found almost every episode through the sitemap alone and left 53 of them
 * "Discovered – currently not indexed".
 *
 * The same data is embedded as window.__ROGUEPOD_PRELOAD__ so the browser
 * hydrates the markup rather than replacing it (see src/data/preload.tsx), and
 * #root carries data-prerendered with the path it was rendered for.
 *
 * GitHub Pages has no SPA rewrite: a path with no file behind it is served by
 * 404.html with a real HTTP 404, which a crawler takes at its word. A route
 * that isn't rendered here is not indexable, whatever the sitemap says.
 *
 * Canonical URLs all end in a slash, because that's the only form Pages answers
 * 200 for — see the note in generate-sitemap.js, which has to agree with this
 * file about every URL it emits.
 *
 * Requires package.json "homepage" to be root-absolute ("/"). With "." the
 * emitted asset paths are relative and would resolve against /episodes/<slug>/.
 *
 * Runs automatically as part of `npm run build`.
 */

const fs = require('fs');
const path = require('path');
const { readPosts } = require('./blog-posts');
const { loadSsr } = require('./ssr-bundle');

const BUILD_DIR = path.join(__dirname, '../build');
const SITE_URL = 'https://roguepod.show';
const SERIES = { '@type': 'PodcastSeries', name: 'RoguePod LiteCast', url: `${SITE_URL}/` };
const FALLBACK_IMAGE = `${SITE_URL}/cover-art.png`;

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Replace the content of a meta tag matched by an attribute selector. */
const setMeta = (html, attr, name, content) => {
  const pattern = new RegExp(`(<meta\\s+${attr}="${name}"\\s+content=")[^"]*(")`, 'i');
  if (pattern.test(html)) return html.replace(pattern, `$1${escapeHtml(content)}$2`);
  return html.replace(
    '</head>',
    `  <meta ${attr}="${name}" content="${escapeHtml(content)}" />\n</head>`
  );
};

const removeMeta = (html, attr, name) =>
  html.replace(new RegExp(`<meta\\s+${attr}="${name}"\\s+content="[^"]*"\\s*/?>\\s*`, 'i'), '');

const setTitle = (html, title) =>
  html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

const setCanonical = (html, url) =>
  html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtml(url)}" />`
  );

const stripJsonLd = (html) =>
  html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '');

/** JSON inside a <script> must not be able to close it. */
const scriptSafeJson = (data) =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const addJsonLd = (html, data) =>
  html.replace(
    '</head>',
    `  <script type="application/ld+json">\n${scriptSafeJson(data)}\n  </script>\n</head>`
  );

const breadcrumbs = (trail) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, url], index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name,
    item: url,
  })),
});

const write = (relativeDir, html) => {
  const dir = path.join(BUILD_DIR, relativeDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
};

/** Width and height from a PNG's IHDR chunk; the tier list grows as games are added. */
const pngSize = (file) => {
  const header = fs.readFileSync(file).subarray(16, 24);
  return [header.readUInt32BE(0), header.readUInt32BE(4)];
};

const readBuildJson = (relative) =>
  JSON.parse(fs.readFileSync(path.join(BUILD_DIR, relative), 'utf8'));

async function main() {
  const template = path.join(BUILD_DIR, 'index.html');
  if (!fs.existsSync(template)) {
    console.error('No build/index.html — run the CRA build first');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(template, 'utf8');

  // Sanity-check the asset paths; relative ones would 404 from a nested page.
  if (/(?:src|href)="\.\/static\//.test(baseHtml)) {
    console.error(
      'Build emitted relative asset paths (./static/...). Set "homepage": "/" in package.json — ' +
        'prerendered pages at /episodes/<slug>/ cannot resolve them.'
    );
    process.exit(1);
  }
  if (!baseHtml.includes('<div id="root"></div>')) {
    console.error('build/index.html has no empty <div id="root"></div> to render into');
    process.exit(1);
  }

  const ssr = loadSsr();
  const feed = readBuildJson('episodes.json');
  const tierList = fs.existsSync(path.join(BUILD_DIR, 'tiers.json'))
    ? readBuildJson('tiers.json')
    : { tiers: [] };
  const { episodes = [], episodeCount = 0 } = feed;
  const episodeData = { '/episodes.json': feed, '/tiers.json': tierList };

  /**
   * Render a route into the template's #root. Fails the build if the page
   * came out as a loading skeleton or a not-found state — that means its data
   * wasn't preloaded under the URL the component asks for, and the "static"
   * page would be as empty as the ones this script exists to replace.
   */
  const renderRoot = (html, route, preload) => {
    const markup = ssr.render(route, preload);
    if (/animate-pulse|>(?:Episode|Article|Page) not found</.test(markup)) {
      throw new Error(`${route} rendered a loading or not-found state — check its preload`);
    }
    return html.replace(
      '<div id="root"></div>',
      `<div id="root" data-prerendered="${escapeHtml(route)}">${markup}</div>` +
        `<script>window.__ROGUEPOD_PRELOAD__=${scriptSafeJson(preload)}</script>`
    );
  };

  /** A page's head: title, description, social tags, canonical and JSON-LD. */
  const page = ({
    route,
    title,
    description,
    ogType,
    image,
    imageAlt,
    imageSize,
    jsonLd,
    preload,
  }) => {
    const url = `${SITE_URL}${route}`;

    let html = stripJsonLd(baseHtml);
    html = setTitle(html, title);
    html = setMeta(html, 'name', 'title', title);
    html = setMeta(html, 'name', 'description', description);
    html = setMeta(html, 'property', 'og:type', ogType);
    html = setMeta(html, 'property', 'og:title', title);
    html = setMeta(html, 'property', 'og:description', description);
    html = setMeta(html, 'property', 'og:url', url);
    html = setMeta(html, 'property', 'twitter:title', title);
    html = setMeta(html, 'property', 'twitter:description', description);
    html = setMeta(html, 'property', 'twitter:url', url);
    // Without an image of its own, a page keeps the site-wide share card
    // (and its alt text) from public/index.html.
    if (image) {
      html = setMeta(html, 'property', 'og:image', image);
      // The template's 1200x630 describes the site share card; an image of
      // unknown size (a blog screenshot) is better with no dimensions than wrong ones.
      if (imageSize) {
        html = setMeta(html, 'property', 'og:image:width', String(imageSize[0]));
        html = setMeta(html, 'property', 'og:image:height', String(imageSize[1]));
      } else {
        html = removeMeta(html, 'property', 'og:image:width');
        html = removeMeta(html, 'property', 'og:image:height');
      }
      html = setMeta(html, 'property', 'twitter:card', 'summary_large_image');
      html = setMeta(html, 'property', 'twitter:image', image);
      html = setMeta(html, 'property', 'og:image:alt', imageAlt);
      html = setMeta(html, 'name', 'twitter:image:alt', imageAlt);
    }
    html = setCanonical(html, url);
    for (const data of jsonLd) html = addJsonLd(html, data);
    return renderRoot(html, route, preload);
  };

  // --- Episode index -------------------------------------------------------
  const indexUrl = `${SITE_URL}/episodes/`;
  write(
    'episodes',
    page({
      route: '/episodes/',
      title: 'All episodes | RoguePod LiteCast',
      description:
        `Every episode of RoguePod LiteCast — ${episodeCount} roguelites played, discussed, ` +
        'and placed on the tier list by Danny and David.',
      ogType: 'website',
      preload: episodeData,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'All episodes',
          url: indexUrl,
          isPartOf: SERIES,
        },
      ],
    })
  );

  // --- One page per episode ------------------------------------------------
  for (const episode of episodes) {
    const url = `${SITE_URL}/episodes/${episode.slug}/`;
    const description = ssr.episodeDescription(episode.title, episode.blurb);
    const image = episode.share ? `${SITE_URL}${episode.share}` : null;
    const duration = ssr.isoDuration(episode.duration || '');

    write(
      path.join('episodes', episode.slug),
      page({
        route: `/episodes/${episode.slug}/`,
        title: ssr.episodeTitle(episode.title),
        description,
        ogType: 'article',
        image,
        imageAlt: `RoguePod LiteCast podcast review of ${episode.title}`,
        imageSize: [1200, 630],
        preload: episodeData,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'PodcastEpisode',
            name: episode.title,
            url,
            datePublished: new Date(episode.publishedAt).toISOString(),
            description,
            image: image || FALLBACK_IMAGE,
            ...(episode.number ? { episodeNumber: episode.number } : {}),
            ...(duration ? { timeRequired: duration } : {}),
            ...(episode.audio
              ? {
                  associatedMedia: {
                    '@type': 'MediaObject',
                    contentUrl: episode.audio,
                    encodingFormat: 'audio/mpeg',
                    ...(duration ? { duration } : {}),
                  },
                }
              : {}),
            partOfSeries: SERIES,
          },
          breadcrumbs([
            ['RoguePod LiteCast', `${SITE_URL}/`],
            ['Episodes', indexUrl],
            [episode.title, url],
          ]),
        ],
      })
    );
  }

  // --- Tier list -------------------------------------------------------------
  const bySlug = new Map(episodes.map((episode) => [episode.slug, episode]));
  const placed = tierList.tiers.flatMap((row) =>
    row.games.map((game) => ({ ...game, tier: row.tier, episode: bySlug.get(game.slug) }))
  );
  if (placed.length > 0) {
    const tierUrl = `${SITE_URL}/tier-list/`;
    write(
      'tier-list',
      page({
        route: '/tier-list/',
        title: ssr.TIER_LIST_TITLE,
        description:
          `RoguePod LiteCast's ultimate roguelite tier list: all ${placed.length} games we've ` +
          'reviewed on the podcast, ranked S to F, each linked to its episode.',
        ogType: 'website',
        image: `${SITE_URL}/tierlist.png`,
        imageAlt: 'The RoguePod LiteCast roguelite tier list, ranked S to F',
        imageSize: pngSize(path.join(BUILD_DIR, 'tierlist.png')),
        preload: episodeData,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: ssr.TIER_LIST_TITLE,
            url: tierUrl,
            isPartOf: SERIES,
            mainEntity: {
              '@type': 'ItemList',
              itemListOrder: 'https://schema.org/ItemListOrderAscending',
              numberOfItems: placed.length,
              itemListElement: placed.map((game, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: `${game.episode ? game.episode.title : game.name} (${game.tier} tier)`,
                ...(game.episode ? { url: `${SITE_URL}/episodes/${game.episode.slug}/` } : {}),
              })),
            },
          },
          breadcrumbs([
            ['RoguePod LiteCast', `${SITE_URL}/`],
            ['Tier list', tierUrl],
          ]),
        ],
      })
    );
  } else {
    console.warn('⚠ No tier data (public/tiers.json) — skipping /tier-list/');
  }

  // --- Roguelite vs roguelike ---------------------------------------------
  // Static copy, no data to preload.
  const definitionsUrl = `${SITE_URL}/roguelite-vs-roguelike/`;
  write(
    'roguelite-vs-roguelike',
    page({
      route: '/roguelite-vs-roguelike/',
      title: ssr.DEFINITIONS_TITLE,
      description:
        'Roguelite or roguelike? How RoguePod LiteCast uses the terms, from traditional ' +
        'roguelikes to metaprogression, and why the show calls all non-traditional ' +
        'roguelikes roguelites.',
      ogType: 'article',
      preload: {},
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Roguelite vs Roguelike',
          url: definitionsUrl,
          isPartOf: { '@type': 'WebSite', name: 'RoguePod LiteCast', url: `${SITE_URL}/` },
        },
        breadcrumbs([
          ['RoguePod LiteCast', `${SITE_URL}/`],
          ['Roguelite vs Roguelike', definitionsUrl],
        ]),
      ],
    })
  );

  // --- Blog ----------------------------------------------------------------
  const posts = readPosts();
  if (posts.length > 0) {
    const blogUrl = `${SITE_URL}/blog/`;
    write(
      'blog',
      page({
        route: '/blog/',
        title: 'Blog | RoguePod LiteCast',
        description:
          'Written reviews and companion articles from RoguePod LiteCast — Danny and ' +
          'David on the roguelites they play for the show.',
        ogType: 'website',
        preload: { '/blog-index.json': readBuildJson('blog-index.json') },
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Blog',
            name: 'RoguePod LiteCast Blog',
            url: blogUrl,
            publisher: { '@type': 'Organization', name: 'RoguePod LiteCast', url: `${SITE_URL}/` },
          },
        ],
      })
    );

    for (const post of posts) {
      const url = `${SITE_URL}/blog/${post.slug}/`;
      const description = post.excerpt || post.title;
      // Posts reference their screenshots root-absolutely, so the first one
      // makes a better card than the generic share image.
      const firstImage = (post.body.match(/!\[[^\]]*\]\((\/[^)\s]+)\)/) || [])[1];
      const image = firstImage ? `${SITE_URL}${firstImage}` : null;

      write(
        path.join('blog', post.slug),
        page({
          route: `/blog/${post.slug}/`,
          title: `${post.title} | RoguePod LiteCast`,
          description,
          ogType: 'article',
          image,
          imageAlt: post.title,
          preload: { [`/blog/${post.slug}.json`]: readBuildJson(`blog/${post.slug}.json`) },
          jsonLd: [
            {
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: post.title,
              url,
              mainEntityOfPage: url,
              description,
              image: image || FALLBACK_IMAGE,
              ...(post.date && !Number.isNaN(new Date(post.date).getTime())
                ? { datePublished: new Date(post.date).toISOString() }
                : {}),
              ...(post.author ? { author: { '@type': 'Person', name: post.author } } : {}),
              publisher: {
                '@type': 'Organization',
                name: 'RoguePod LiteCast',
                url: `${SITE_URL}/`,
              },
              isPartOf: { '@type': 'Blog', name: 'RoguePod LiteCast Blog', url: blogUrl },
            },
          ],
        })
      );
    }
  }

  // --- Home ----------------------------------------------------------------
  // Last, because it overwrites the template everything above was built from.
  // Its head (and the PodcastSeries JSON-LD) is public/index.html as written.
  write('', renderRoot(baseHtml, '/', { '/episodes.json': feed }));

  console.log(
    `Prerendered home + ${episodes.length} episode pages + /episodes index` +
      (placed.length > 0 ? ' + /tier-list' : '') +
      ' + /roguelite-vs-roguelike' +
      (posts.length > 0 ? ` + ${posts.length} blog posts + /blog index` : '')
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
