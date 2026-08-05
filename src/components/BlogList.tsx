import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon } from './Icons';

/*
 * blog-index.json carries everything this page renders — written by
 * scripts/generate-blog-index.js, already filtered to published posts and
 * sorted newest first. It used to hold filenames only, so rendering a list of
 * summaries meant downloading the full markdown of every post to read its
 * frontmatter.
 */
interface BlogPostPreview {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  slug: string;
}

const BlogList: React.FC = () => {
  const [posts, setPosts] = useState<BlogPostPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Articles | RoguePod LiteCast';

    const loadPosts = async () => {
      try {
        const response = await fetch('/blog-index.json');
        const index: BlogPostPreview[] = await response.json();

        setPosts(index);
      } catch (err) {
        console.error('Failed to load posts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-8 pt-32 sm:px-8 sm:pt-40">
      <header>
        <p className="eyebrow">Articles</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Companion articles</h1>
        <p className="mt-4 text-base leading-relaxed text-bone-200">
          We occasionally write up our reviews in article form. Everything here has a matching
          podcast episode.
        </p>
      </header>

      {loading ? (
        <div className="mt-12 space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse border border-ink-600 bg-ink-800" />
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="rule mt-12">
          {posts.map((post) => (
            <article key={post.slug} className="rule -mt-px">
              <Link to={`/blog/${post.slug}`} className="group block py-8">
                <time
                  dateTime={post.date}
                  className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-bone-400"
                >
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
                <h2 className="mt-3 font-display text-xl font-semibold text-bone-50 transition-colors group-hover:text-signal-bright sm:text-2xl">
                  {post.title}
                </h2>
                <p className="mt-3 leading-relaxed text-bone-200">{post.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.08em] text-bone-100">
                  Read
                  <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-12 text-bone-300">No articles yet — check back soon.</p>
      )}
    </div>
  );
};

export default BlogList;
