/**
 * One reader for the markdown posts in public/blog, shared by the sitemap
 * generator and the prerenderer.
 *
 * Both used to parse frontmatter themselves, with different parsers, which is
 * how a post could be published to the site and still be absent from — or
 * present but unreachable in — the other half of the build.
 *
 * `published: false` posts are drafts: no sitemap entry, no prerendered page.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const PUBLIC_DIR = path.join(__dirname, '../public');
const BLOG_DIR = path.join(PUBLIC_DIR, 'blog');
const BLOG_INDEX = path.join(PUBLIC_DIR, 'blog-index.json');

/** The index is written by generate-blog-index.js; fall back to a dir scan. */
const indexedNames = () => {
  try {
    const names = JSON.parse(fs.readFileSync(BLOG_INDEX, 'utf8'));
    if (Array.isArray(names) && names.length > 0) return names;
  } catch {
    /* fall through */
  }
  try {
    return fs
      .readdirSync(BLOG_DIR)
      .filter((file) => file.endsWith('.md') && file !== 'POST_TEMPLATE.md')
      .map((file) => file.replace(/\.md$/, ''));
  } catch {
    return [];
  }
};

/**
 * Every published post, newest first.
 *
 * `raw` is the whole file including frontmatter — it's what the sitemap
 * fingerprints, so any edit to a post moves its lastmod. `body` has the
 * leading H1 stripped, matching BlogPost.tsx: posts repeat their own title as
 * an H1 and the frontmatter title already supplies the page's heading.
 */
function readPosts() {
  return indexedNames()
    .map((name) => {
      let raw;
      try {
        raw = fs.readFileSync(path.join(BLOG_DIR, `${name}.md`), 'utf8');
      } catch {
        return null;
      }

      const { data, content } = matter(raw);
      // Frontmatter is quoted in every post, but YAML also yields real booleans.
      if (String(data.published).trim() !== 'true') return null;

      const slug = String(data.slug || name).trim();
      if (!slug) {
        console.warn(`⚠ Blog post ${name}.md has no slug — skipping`);
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

module.exports = { readPosts };
