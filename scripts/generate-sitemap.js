/**
 * Generates public/sitemap.xml from the episode snapshot and the blog index.
 *
 * This used to be maintained by hand, which was already easy to forget for blog
 * posts and is unmanageable now that there's a page per episode.
 *
 * Runs as part of `npm run build`, before the CRA build copies public/ across.
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public');
const SITE_URL = 'https://roguepod.show';

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, file), 'utf8'));
  } catch {
    return fallback;
  }
};

/** Pull one value out of a markdown file's YAML frontmatter. */
const frontmatter = (markdown, key) => {
  const block = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!block) return '';
  const line = block[1].split('\n').find((l) => l.trim().startsWith(`${key}:`));
  if (!line) return '';
  return line.slice(line.indexOf(':') + 1).trim().replace(/^["']|["']$/g, '');
};

const isoDay = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const urlEntry = ({ loc, lastmod, changefreq, priority }) =>
  [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');

function main() {
  const { episodes = [] } = readJson('episodes.json', {});
  const blogSlugs = readJson('blog-index.json', []);

  const urls = [
    { loc: `${SITE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}/episodes`, changefreq: 'weekly', priority: '0.9' },
  ];

  for (const episode of episodes) {
    urls.push({
      loc: `${SITE_URL}/episodes/${episode.slug}`,
      lastmod: isoDay(episode.publishedAt),
      changefreq: 'monthly',
      priority: '0.8',
    });
  }

  const posts = blogSlugs
    .map((name) => {
      try {
        const markdown = fs.readFileSync(path.join(PUBLIC_DIR, 'blog', `${name}.md`), 'utf8');
        return {
          slug: frontmatter(markdown, 'slug') || name,
          date: frontmatter(markdown, 'date'),
          published: frontmatter(markdown, 'published') === 'true',
        };
      } catch {
        return null;
      }
    })
    .filter((post) => post && post.published);

  if (posts.length > 0) {
    urls.push({ loc: `${SITE_URL}/blog`, changefreq: 'weekly', priority: '0.6' });
    for (const post of posts) {
      urls.push({
        loc: `${SITE_URL}/blog/${post.slug}`,
        lastmod: isoDay(post.date),
        changefreq: 'monthly',
        priority: '0.5',
      });
    }
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(urlEntry).join('\n') +
    '\n</urlset>\n';

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), xml);
  console.log(`Generated sitemap with ${urls.length} URLs`);
}

main();
