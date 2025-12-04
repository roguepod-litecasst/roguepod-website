import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface BlogPostPreview {
  title: string;
  date: string;
  author: string;
  excerpt: string;
  slug: string;
  published: boolean;
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

const BlogList: React.FC = () => {
  const [posts, setPosts] = useState<BlogPostPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        // Fetch the auto-generated blog index
        const indexResponse = await fetch('/blog-index.json');
        const postFiles: string[] = await indexResponse.json();

        const postPromises = postFiles.map(async (filename) => {
          const response = await fetch(`/blog/${filename}.md`);
          const markdown = await response.text();
          const { data } = parseFrontmatter(markdown);

          return {
            title: data.title,
            date: data.date,
            author: data.author,
            excerpt: data.excerpt,
            slug: data.slug,
            published: data.published === 'true'
          };
        });

        const loadedPosts = await Promise.all(postPromises);

        // Filter to only show published posts
        const publishedPosts = loadedPosts.filter(post => post.published);

        // Sort by date, newest first
        publishedPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setPosts(publishedPosts);
      } catch (err) {
        console.error('Failed to load posts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-xl">Loading posts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header */}
        <header className="text-center mb-12">
          <Link
            to="/"
            className="inline-block mb-6 text-indigo-400 hover:text-indigo-300 transition-colors duration-200 font-medium"
          >
            ← Back to Home
          </Link>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Companion Articles
          </h1>
          <p className="text-xl text-gray-400">
            We occasionally summarize our podcast reviews in article form here.
          </p>
        </header>

        {/* Posts Grid */}
        <div className="grid gap-8 md:grid-cols-2">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-700"
            >
              <div className="p-8">
                {/* Date */}
                <time className="text-sm text-indigo-400 font-semibold uppercase tracking-wide">
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>

                {/* Title */}
                <h2 className="mt-3 text-2xl font-bold text-white hover:text-indigo-400 transition-colors">
                  <Link to={`/blog/${post.slug}`}>
                    {post.title}
                  </Link>
                </h2>

                {/* Excerpt */}
                <p className="mt-3 text-gray-300 leading-relaxed">
                  {post.excerpt}
                </p>

                {/* Author & Read More */}
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    By {post.author}
                  </span>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
                  >
                    Read more →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Empty State */}
        {posts.length === 0 && (
          <div className="text-center text-gray-400 text-xl">
            No posts yet. Check back soon!
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-16 text-center">
          <Link
            to="/"
            className="inline-block bg-indigo-600 text-white font-bold py-3 px-8 rounded-full hover:bg-indigo-700 transition-all duration-200 shadow-lg"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogList;
