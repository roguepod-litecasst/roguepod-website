import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

/*
 * Posts are fetched as pre-rendered JSON, written by
 * scripts/generate-blog-index.js. The markdown sources deliberately never ship
 * — see scripts/blog-posts.js — so there's no frontmatter to parse and no
 * markdown renderer in the bundle.
 */
interface BlogPostData {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  slug: string;
  html: string;
}

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

        const response = await fetch(`/blog/${slug}.json`);
        if (!response.ok) {
          throw new Error('Post not found');
        }

        const data: BlogPostData = await response.json();

        setPost(data);
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
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </article>
    </div>
  );
};

export default BlogPost;
