import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { marked } from 'marked';

interface BlogPostData {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  slug: string;
  content: string;
}

// Simple frontmatter parser for browser
const parseFrontmatter = (markdown: string) => {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return { data: {}, content: markdown };
  }

  const frontmatterText = match[1];
  const content = match[2];

  const data: Record<string, string> = {};
  frontmatterText.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
      data[key] = value;
    }
  });

  return { data, content };
};

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch the markdown file
        const response = await fetch(`/blog/${slug}.md`);
        if (!response.ok) {
          throw new Error('Post not found');
        }

        const markdown = await response.text();
        const { data, content } = parseFrontmatter(markdown);

        /*
         * Posts tend to repeat their own title as an H1 at the top of the body,
         * which renders twice because the frontmatter title is already the
         * page's H1. Drop a leading H1 so the post only ever has one.
         */
        const body = content.replace(/^\s*#\s+.*(\r?\n)+/, '');

        // Parse markdown to HTML
        const htmlContent = await marked(body);

        const postData = {
          title: data.title,
          date: data.date,
          author: data.author,
          excerpt: data.excerpt,
          slug: data.slug,
          content: htmlContent
        };

        setPost(postData);
        document.title = `${data.title} | RoguePod LiteCast`;

        // Update meta description for this post
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && data.excerpt) {
          metaDesc.setAttribute('content', data.excerpt);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    loadPost();

    return () => {
      document.title = 'RoguePod LiteCast';
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-32 sm:px-8 sm:pt-40">
        <div className="h-8 w-2/3 animate-pulse bg-ink-800" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-4 animate-pulse bg-ink-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-32 text-center sm:px-8 sm:pt-40">
        <h1 className="text-3xl font-semibold">Article not found</h1>
        <p className="mt-4 text-bone-200">That article doesn&apos;t exist, or it moved.</p>
        <Link
          to="/blog"
          className="mt-8 inline-flex items-center bg-signal px-6 py-3.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-signal-dim"
        >
          All articles
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-8 pt-32 sm:px-8 sm:pt-40">
      <Link
        to="/blog"
        className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400 transition-colors hover:text-signal-bright"
      >
        ← All articles
      </Link>

      <article className="mt-8">
        <header className="rule pb-8">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-bone-400">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
            <span aria-hidden="true">·</span>
            <span>By {post.author}</span>
          </div>
        </header>

        <div
          className="prose prose-invert prose-lg mt-10 max-w-none
            prose-headings:font-display prose-headings:tracking-[-0.02em] prose-headings:text-bone-50
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-bone-200 prose-p:leading-relaxed
            prose-a:text-signal-bright prose-a:no-underline hover:prose-a:underline prose-a:underline-offset-4
            prose-strong:text-bone-50
            prose-li:text-bone-200 prose-li:marker:text-bone-400
            prose-code:text-glitch-teal prose-code:bg-ink-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-none prose-code:before:content-none prose-code:after:content-none
            prose-blockquote:border-l-2 prose-blockquote:border-signal prose-blockquote:text-bone-200 prose-blockquote:not-italic
            prose-img:border prose-img:border-ink-600
            prose-hr:border-ink-600"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  );
};

export default BlogPost;
