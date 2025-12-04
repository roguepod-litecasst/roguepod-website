# Blog Feature Guide

## Overview
The RoguePod website now includes a blog feature where you can write posts about game releases, reviews, and podcast updates.

## Adding a New Blog Post

### 1. Create a Markdown File

Create a new `.md` file in the `public/blog/` directory. Use a descriptive filename that matches your slug:

```
public/blog/your-post-slug.md
```

### 2. Add Frontmatter

Every blog post must start with YAML frontmatter containing metadata:

```yaml
---
title: "Your Post Title"
date: "2025-12-04"
author: "Danny & David"
excerpt: "A brief summary of your post (1-2 sentences)"
slug: "your-post-slug"
---
```

### 3. Write Your Content

After the frontmatter, write your post content in Markdown:

```markdown
# Main Heading

Your content here...

## Subheading

- Bullet points
- Work great

**Bold text** and *italic text* are supported.

[Links work too](https://example.com)
```

### 4. Register the Post

Open `src/components/BlogList.tsx` and add your new post filename to the `postFiles` array (around line 18):

```typescript
const postFiles = [
  'welcome-to-roguepod-blog',
  'slay-the-spire-deep-dive',
  'your-post-slug'  // Add your new post here
];
```

### 5. Test Locally

Run `npm start` and navigate to:
- `http://localhost:3000/blog` - View all posts
- `http://localhost:3000/blog/your-post-slug` - View your specific post

## URLs

Once deployed, your blog will be available at:
- `roguepod.show/blog` - Blog list
- `roguepod.show/blog/your-post-slug` - Individual posts
- `roguepod.show/#tierlist` - Tier list (unchanged)

## Markdown Features Supported

- Headings (H1-H6)
- Bold and italic text
- Links
- Lists (ordered and unordered)
- Code blocks
- Blockquotes
- Images

## Tips

- Use descriptive slugs (lowercase, hyphens instead of spaces)
- Keep excerpts concise (1-2 sentences)
- Posts are sorted by date automatically (newest first)
- The slug in the frontmatter must match your filename (without .md)
