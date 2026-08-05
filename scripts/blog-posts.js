/**
 * One reader for the blog's markdown sources, shared by every build step that
 * touches a post.
 *
 * The markdown lives in content/blog/, **not** public/blog/, and that's
 * deliberate. CRA copies public/ verbatim into the deploy, so while the sources
 * sat there GitHub Pages served every post twice: once as the real page and
 * once as raw text/markdown at /blog/<slug>.md, with no way to mark the second
 * one canonical — Pages can't set an X-Robots-Tag, and a robots.txt Disallow
 * would have blocked the fetch the page itself depended on. Moving the sources
 * out is the only fix that doesn't leave a duplicate document indexable.
 *
 * Images stay in public/blog/ — posts reference them as /blog/<name>.png and
 * they're meant to be fetched.
 *
 * generate-blog-index.js turns these into the JSON the app actually loads.
 * prerender.js and generate-sitemap.js read them directly.
 *
 * `published: false` posts are drafts: no JSON, no sitemap entry, no page.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const BLOG_DIR = path.join(__dirname, '../content/blog');

/**
 * Every published post, newest first.
 *
 * `raw` is the whole file including frontmatter — it's what the sitemap
 * fingerprints, so any edit to a post moves its lastmod. `body` has the
 * leading H1 stripped: posts repeat their own title as an H1 and the
 * frontmatter title already supplies the page's heading.
 */
function readPosts() {
  let files;
  try {
    files = fs.readdirSync(BLOG_DIR);
  } catch {
    return [];
  }

  return files
    .filter((file) => file.endsWith('.md') && file !== 'POST_TEMPLATE.md')
    .map((file) => {
      const name = file.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
      const { data, content } = matter(raw);

      // Frontmatter is quoted in every post, but YAML also yields real booleans.
      if (String(data.published).trim() !== 'true') return null;

      const slug = String(data.slug || name).trim();
      if (!slug) {
        console.warn(`⚠ ${file} has no slug — skipping`);
        return null;
      }

      return {
        slug,
        title: String(data.title || slug),
        date: String(data.date || ''),
        author: String(data.author || ''),
        excerpt: String(data.excerpt || ''),
        raw,
        body: content.replace(/^\s*#\s+.*(\r?\n)+/, ''),
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Markdown → HTML. marked is ESM-only, so this can't be a plain require at the
 * top of a CJS script; every caller is async anyway.
 */
async function renderBody(post) {
  const { marked } = await import('marked');
  return marked(post.body);
}

module.exports = { readPosts, renderBody };
