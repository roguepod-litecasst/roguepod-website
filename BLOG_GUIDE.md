# Blog Guide

Written companion articles for episodes. Linked from the footer, not the main
nav — the blog exists mainly for search.

## Adding a post

Create one markdown file in **`content/blog/`** and that's the whole job. The
build generates the index, the JSON the site loads, the sitemap entry and the
prerendered page.

```
content/blog/your-post-slug.md
```

`content/blog/POST_TEMPLATE.md` is a starting point. Copy it, don't edit it —
the build skips it by name.

### Frontmatter

Every post starts with YAML frontmatter. All six fields are required:

```yaml
---
title: "Your Post Title"
date: "2026-08-05"
author: "Danny & David"
excerpt: "A brief summary, 1-2 sentences. This is the meta description and the blurb on /blog."
slug: "your-post-slug"
published: true
---
```

- `slug` decides the URL: `roguepod.show/blog/your-post-slug/`. Keep it
  matching the filename — lowercase, hyphens.
- **`published: false` means the post doesn't exist** as far as the build is
  concerned: no page, no sitemap entry, nothing served. That's how you park a
  draft in the repo.
- `date` is the publish date. It sets the initial `lastmod`; after that, edits
  advance it automatically (see the sitemap section of `CLAUDE.md`).

### Body

Standard markdown. A leading `# H1` is stripped — the frontmatter `title`
already supplies the page heading, so keeping one in the body is harmless.

Images go in **`public/blog/`** and are referenced root-absolutely:

```markdown
![Alt text that describes the screenshot](/blog/your-screenshot.png)
```

Root-absolute matters: pages live at `/blog/<slug>/`, so a relative path would
resolve one directory too deep. The first image in a post becomes its social
card; if a post has none, the site-wide share card is used.

### Preview it

```bash
npm start
```

Then `localhost:3000/blog` and `localhost:3000/blog/your-post-slug`.

## Why the markdown lives outside `public/`

CRA copies `public/` verbatim into the deploy. While the sources sat there,
every post was served twice — once as the real page, and once as raw
`text/markdown` at `/blog/<slug>.md` — a duplicate document with no way to mark
it non-canonical, since GitHub Pages can't set an `X-Robots-Tag` and a
`robots.txt` Disallow would have blocked the fetch the page itself relied on.

So `scripts/generate-blog-index.js` renders the markdown at build time into
`public/blog/<slug>.json` and `public/blog-index.json`, and the app loads those.
The markdown never ships. Images stay in `public/blog/` because they're meant to
be fetched.

**Don't move the sources back into `public/`,** and don't add a runtime fetch of
anything that duplicates a page's text.

## What the build does with a post

| Step | Output |
|---|---|
| `scripts/generate-blog-index.js` | `public/blog-index.json`, `public/blog/<slug>.json` |
| `scripts/generate-sitemap.js` | a `/blog/<slug>/` entry with a real `lastmod` |
| `scripts/prerender.js` | `build/blog/<slug>/index.html` — meta, OG tags, `BlogPosting` JSON-LD, and the article text for crawlers |

That last one is not optional. GitHub Pages returns a real HTTP **404** for any
path with no file behind it, so a post that isn't prerendered is invisible to
search regardless of what the sitemap claims.

`scripts/validate-sitemap.js` fails the build if any of this goes wrong.
