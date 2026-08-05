/**
 * Stamps out a real HTML file per episode and per blog post after the CRA build.
 *
 * Reddit, Discord, Slack and search crawlers don't run JavaScript. Without this
 * every /episodes/<slug> URL would return the same index.html, so every episode
 * link would preview with the identical show-level title, description and
 * image — which is precisely what the episode pages exist to avoid.
 *
 * For the blog it's worse than a bad preview. GitHub Pages has no SPA rewrite:
 * a path with no file behind it is served by 404.html, with a real HTTP 404.
 * The redirect script in there gets a browser to the right place, but a crawler
 * sees a 404 and leaves. Until these files existed, /blog and every post were
 * unindexable — in the sitemap, and returning 404 to everything that fetched
 * them.
 *
 * Each generated file carries its own <title>, meta description, Open Graph and
 * Twitter tags, canonical URL, schema.org JSON-LD, and a static content block
 * inside #root that React replaces on hydration.
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

const BUILD_DIR = path.join(__dirname, '../build');
const EPISODES_JSON = path.join(__dirname, '../public/episodes.json');
const SITE_URL = 'https://roguepod.show';
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

const setTitle = (html, title) =>
  html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

const setCanonical = (html, url) =>
  html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtml(url)}" />`
  );

/**
 * Swap the crawler-visible placeholder inside #root. React replaces this on
 * mount, so it only ever renders for non-JS clients and crawlers.
 */
const setRootContent = (html, content) =>
  html.replace(
    /(<div id="root">)[\s\S]*?(<\/div>\s*<\/body>)/i,
    (_match, open, close) => `${open}${content}${close}`
  );

const stripJsonLd = (html) =>
  html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '');

const addJsonLd = (html, data) =>
  html.replace(
    '</head>',
    `  <script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n  </script>\n</head>`
  );

const write = (relativeDir, html) => {
  const dir = path.join(BUILD_DIR, relativeDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
};

async function main() {
  const template = path.join(BUILD_DIR, 'index.html');
  if (!fs.existsSync(template)) {
    console.error('No build/index.html — run the CRA build first');
    process.exit(1);
  }
  if (!fs.existsSync(EPISODES_JSON)) {
    console.warn('⚠ No public/episodes.json — skipping prerender');
    return;
  }

  const baseHtml = fs.readFileSync(template, 'utf8');
  const { episodes = [], episodeCount = 0 } = JSON.parse(
    fs.readFileSync(EPISODES_JSON, 'utf8')
  );

  // Sanity-check the asset paths; relative ones would 404 from a nested page.
  if (/(?:src|href)="\.\/static\//.test(baseHtml)) {
    console.error(
      'Build emitted relative asset paths (./static/...). Set "homepage": "/" in package.json — ' +
        'prerendered pages at /episodes/<slug>/ cannot resolve them.'
    );
    process.exit(1);
  }

  // --- Episode index -------------------------------------------------------
  const indexTitle = 'All episodes | RoguePod LiteCast';
  const indexDescription =
    `Every episode of RoguePod LiteCast — ${episodeCount} roguelites played, discussed, ` +
    'and placed on the tier list by Danny and David.';
  const indexUrl = `${SITE_URL}/episodes/`;

  let indexHtml = baseHtml;
  indexHtml = stripJsonLd(indexHtml);
  indexHtml = setTitle(indexHtml, indexTitle);
  indexHtml = setMeta(indexHtml, 'name', 'title', indexTitle);
  indexHtml = setMeta(indexHtml, 'name', 'description', indexDescription);
  indexHtml = setMeta(indexHtml, 'property', 'og:type', 'website');
  indexHtml = setMeta(indexHtml, 'property', 'og:title', indexTitle);
  indexHtml = setMeta(indexHtml, 'property', 'og:description', indexDescription);
  indexHtml = setMeta(indexHtml, 'property', 'og:url', indexUrl);
  indexHtml = setMeta(indexHtml, 'property', 'twitter:title', indexTitle);
  indexHtml = setMeta(indexHtml, 'property', 'twitter:description', indexDescription);
  indexHtml = setMeta(indexHtml, 'property', 'twitter:url', indexUrl);
  indexHtml = setCanonical(indexHtml, indexUrl);
  indexHtml = setRootContent(
    indexHtml,
    `<div style="font-family: system-ui, sans-serif; padding: 2rem; background: #08090A; color: #E8EAED; min-height: 100vh;">
      <h1 style="color:#fff;">All episodes</h1>
      <p style="color:#B7BCC4;">${escapeHtml(indexDescription)}</p>
      <ul>${episodes
        .map(
          (ep) =>
            `<li><a style="color:#FF3B30;" href="/episodes/${escapeHtml(ep.slug)}/">${escapeHtml(
              ep.title
            )}</a></li>`
        )
        .join('')}</ul>
    </div>`
  );
  indexHtml = addJsonLd(indexHtml, {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'All episodes',
    url: indexUrl,
    isPartOf: { '@type': 'PodcastSeries', name: 'RoguePod LiteCast', url: SITE_URL },
  });
  write('episodes', indexHtml);

  // --- One page per episode ------------------------------------------------
  for (const episode of episodes) {
    const url = `${SITE_URL}/episodes/${episode.slug}/`;
    const title = `${episode.title} | RoguePod LiteCast`;
    const description =
      episode.blurb ||
      `Danny and David review ${episode.title} and add it to the ultimate roguelite tier list.`;
    const image = episode.share ? `${SITE_URL}${episode.share}` : FALLBACK_IMAGE;

    let html = baseHtml;
    html = stripJsonLd(html);
    html = setTitle(html, title);
    html = setMeta(html, 'name', 'title', title);
    html = setMeta(html, 'name', 'description', description);
    html = setMeta(html, 'property', 'og:type', 'article');
    html = setMeta(html, 'property', 'og:title', `${episode.title} — RoguePod LiteCast`);
    html = setMeta(html, 'property', 'og:description', description);
    html = setMeta(html, 'property', 'og:url', url);
    html = setMeta(html, 'property', 'og:image', image);
    html = setMeta(html, 'property', 'og:image:width', '1200');
    html = setMeta(html, 'property', 'og:image:height', '630');
    html = setMeta(html, 'property', 'twitter:card', 'summary_large_image');
    html = setMeta(html, 'property', 'twitter:title', `${episode.title} — RoguePod LiteCast`);
    html = setMeta(html, 'property', 'twitter:description', description);
    html = setMeta(html, 'property', 'twitter:url', url);
    html = setMeta(html, 'property', 'twitter:image', image);
    html = setCanonical(html, url);

    const paragraphs = (episode.blocks || [])
      .map((block) => `<p style="color:#B7BCC4;">${escapeHtml(block.text)}</p>`)
      .join('');

    html = setRootContent(
      html,
      `<div style="font-family: system-ui, sans-serif; padding: 2rem; background: #08090A; color: #E8EAED; min-height: 100vh;">
        <p style="color:#FF3B30;">RoguePod LiteCast${
          episode.number ? ` · Episode ${episode.number}` : ''
        }</p>
        <h1 style="color:#fff;">${escapeHtml(episode.title)}</h1>
        <p style="color:#878D97;">${escapeHtml(episode.publishedAt)}${
          episode.duration ? ` · ${escapeHtml(episode.duration)}` : ''
        }</p>
        ${paragraphs}
        <p>${
          episode.apple
            ? `<a style="color:#FF3B30;" href="${escapeHtml(episode.apple)}">Apple Podcasts</a> · `
            : ''
        }<a style="color:#FF3B30;" href="${escapeHtml(episode.link)}">Acast</a> · <a style="color:#FF3B30;" href="${SITE_URL}/#tierlist">The tier list</a></p>
      </div>`
    );

    html = addJsonLd(html, {
      '@context': 'https://schema.org',
      '@type': 'PodcastEpisode',
      name: episode.title,
      url,
      datePublished: new Date(episode.publishedAt).toISOString(),
      description,
      image,
      ...(episode.number ? { episodeNumber: episode.number } : {}),
      associatedMedia: episode.audio
        ? { '@type': 'MediaObject', contentUrl: episode.audio, encodingFormat: 'audio/mpeg' }
        : undefined,
      partOfSeries: {
        '@type': 'PodcastSeries',
        name: 'RoguePod LiteCast',
        url: SITE_URL,
      },
    });

    write(path.join('episodes', episode.slug), html);
  }

  // --- Blog ----------------------------------------------------------------
  const posts = readPosts();
  if (posts.length > 0) {
    // marked is ESM-only, so it can't be required at the top of a CJS script.
    const { marked } = await import('marked');

    const blogUrl = `${SITE_URL}/blog/`;
    const blogTitle = 'Blog | RoguePod LiteCast';
    const blogDescription =
      'Written reviews and companion articles from RoguePod LiteCast — Danny and ' +
      'David on the roguelites they play for the show.';

    let blogHtml = baseHtml;
    blogHtml = stripJsonLd(blogHtml);
    blogHtml = setTitle(blogHtml, blogTitle);
    blogHtml = setMeta(blogHtml, 'name', 'title', blogTitle);
    blogHtml = setMeta(blogHtml, 'name', 'description', blogDescription);
    blogHtml = setMeta(blogHtml, 'property', 'og:type', 'website');
    blogHtml = setMeta(blogHtml, 'property', 'og:title', blogTitle);
    blogHtml = setMeta(blogHtml, 'property', 'og:description', blogDescription);
    blogHtml = setMeta(blogHtml, 'property', 'og:url', blogUrl);
    blogHtml = setMeta(blogHtml, 'property', 'twitter:title', blogTitle);
    blogHtml = setMeta(blogHtml, 'property', 'twitter:description', blogDescription);
    blogHtml = setMeta(blogHtml, 'property', 'twitter:url', blogUrl);
    blogHtml = setCanonical(blogHtml, blogUrl);
    blogHtml = setRootContent(
      blogHtml,
      `<div style="font-family: system-ui, sans-serif; padding: 2rem; background: #08090A; color: #E8EAED; min-height: 100vh;">
        <h1 style="color:#fff;">Blog</h1>
        <p style="color:#B7BCC4;">${escapeHtml(blogDescription)}</p>
        <ul>${posts
          .map(
            (post) =>
              `<li><a style="color:#FF3B30;" href="/blog/${escapeHtml(
                post.slug
              )}/">${escapeHtml(post.title)}</a></li>`
          )
          .join('')}</ul>
      </div>`
    );
    blogHtml = addJsonLd(blogHtml, {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'RoguePod LiteCast Blog',
      url: blogUrl,
      publisher: { '@type': 'Organization', name: 'RoguePod LiteCast', url: SITE_URL },
    });
    write('blog', blogHtml);

    for (const post of posts) {
      const url = `${SITE_URL}/blog/${post.slug}/`;
      const title = `${post.title} | RoguePod LiteCast`;
      const description = post.excerpt || post.title;
      // Posts reference their screenshots root-absolutely, so the first one
      // makes a better card than the generic share image.
      const firstImage = (post.body.match(/!\[[^\]]*\]\((\/[^)\s]+)\)/) || [])[1];
      const image = firstImage ? `${SITE_URL}${firstImage}` : FALLBACK_IMAGE;

      let html = baseHtml;
      html = stripJsonLd(html);
      html = setTitle(html, title);
      html = setMeta(html, 'name', 'title', title);
      html = setMeta(html, 'name', 'description', description);
      html = setMeta(html, 'property', 'og:type', 'article');
      html = setMeta(html, 'property', 'og:title', `${post.title} — RoguePod LiteCast`);
      html = setMeta(html, 'property', 'og:description', description);
      html = setMeta(html, 'property', 'og:url', url);
      html = setMeta(html, 'property', 'og:image', image);
      html = setMeta(html, 'property', 'twitter:card', 'summary_large_image');
      html = setMeta(html, 'property', 'twitter:title', `${post.title} — RoguePod LiteCast`);
      html = setMeta(html, 'property', 'twitter:description', description);
      html = setMeta(html, 'property', 'twitter:url', url);
      html = setMeta(html, 'property', 'twitter:image', image);
      html = setCanonical(html, url);

      html = setRootContent(
        html,
        `<div style="font-family: system-ui, sans-serif; padding: 2rem; background: #08090A; color: #E8EAED; min-height: 100vh;">
          <h1 style="color:#fff;">${escapeHtml(post.title)}</h1>
          <p style="color:#878D97;">${escapeHtml(post.date)}${
            post.author ? ` · By ${escapeHtml(post.author)}` : ''
          }</p>
          ${await marked(post.body)}
          <p><a style="color:#FF3B30;" href="/blog/">All articles</a></p>
        </div>`
      );

      html = addJsonLd(html, {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        url,
        mainEntityOfPage: url,
        description,
        image,
        ...(post.date && !Number.isNaN(new Date(post.date).getTime())
          ? { datePublished: new Date(post.date).toISOString() }
          : {}),
        ...(post.author ? { author: { '@type': 'Person', name: post.author } } : {}),
        publisher: { '@type': 'Organization', name: 'RoguePod LiteCast', url: SITE_URL },
        isPartOf: { '@type': 'Blog', name: 'RoguePod LiteCast Blog', url: blogUrl },
      });

      write(path.join('blog', post.slug), html);
    }
  }

  console.log(
    `Prerendered ${episodes.length} episode pages + /episodes index` +
      (posts.length > 0 ? ` + ${posts.length} blog posts + /blog index` : '')
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
