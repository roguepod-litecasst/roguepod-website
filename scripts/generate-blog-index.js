/**
 * Turns the markdown in content/blog/ into the JSON the app loads at runtime.
 *
 * Writes two things into public/:
 *   - blog-index.json — the list page's whole payload: slug, title, date,
 *     author and excerpt per post, newest first. BlogList used to fetch the
 *     full markdown of every post just to read its frontmatter, which is a lot
 *     of text to download in order to render a summary.
 *   - blog/<slug>.json — one per post, frontmatter plus rendered HTML.
 *
 * Serving rendered JSON rather than the markdown source is what keeps the
 * sources out of public/ — see the note in blog-posts.js for why that matters.
 * It also drops `marked` from the browser bundle: the HTML is already built.
 *
 * Runs first in `npm start` and `npm run build`.
 */

const fs = require('fs');
const path = require('path');
const { readPosts, renderBody } = require('./blog-posts');

const PUBLIC_DIR = path.join(__dirname, '../public');
const BLOG_OUT = path.join(PUBLIC_DIR, 'blog');

async function main() {
  const posts = readPosts();
  fs.mkdirSync(BLOG_OUT, { recursive: true });

  const written = new Set();
  for (const post of posts) {
    const file = `${post.slug}.json`;
    fs.writeFileSync(
      path.join(BLOG_OUT, file),
      `${JSON.stringify(
        {
          slug: post.slug,
          title: post.title,
          date: post.date,
          author: post.author,
          excerpt: post.excerpt,
          html: await renderBody(post),
        },
        null,
        2
      )}\n`
    );
    written.add(file);
  }

  // A post that was deleted or unpublished would otherwise keep serving from
  // its stale JSON, since nothing else ever removes these.
  for (const file of fs.readdirSync(BLOG_OUT)) {
    if (file.endsWith('.json') && !written.has(file)) {
      fs.unlinkSync(path.join(BLOG_OUT, file));
      console.log(`Removed stale public/blog/${file}`);
    }
  }

  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'blog-index.json'),
    `${JSON.stringify(
      posts.map(({ slug, title, date, author, excerpt }) => ({
        slug,
        title,
        date,
        author,
        excerpt,
      })),
      null,
      2
    )}\n`
  );

  console.log(
    `Generated blog index with ${posts.length} post(s):`,
    posts.map((post) => post.slug).join(', ') || '(none)'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
