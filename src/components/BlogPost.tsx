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

        // Parse markdown to HTML
        const htmlContent = await marked(content);

        setPost({
          title: data.title,
          date: data.date,
          author: data.author,
          excerpt: data.excerpt,
          slug: data.slug,
          content: htmlContent
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-4xl font-bold mb-4">Post Not Found</h1>
          <Link
            to="/blog"
            className="text-indigo-400 hover:text-indigo-300 underline transition-colors duration-200"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back button */}
        <Link
          to="/blog"
          className="inline-block mb-8 text-indigo-400 hover:text-indigo-300 transition-colors duration-200 font-medium"
        >
          ← Back to Blog
        </Link>

        {/* Article */}
        <article className="bg-gray-800 rounded-xl shadow-md p-8 md:p-12 border border-gray-700">
          {/* Header */}
          <header className="mb-8 pb-8 border-b border-gray-700">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center text-gray-400 text-sm gap-4">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
              <span>•</span>
              <span>By {post.author}</span>
            </div>
          </header>

          {/* Content */}
          <div
            className="prose prose-lg max-w-none
              prose-headings:font-bold prose-headings:text-white
              prose-h1:text-3xl prose-h1:mb-4 prose-h1:text-white
              prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-8 prose-h2:text-white
              prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-6 prose-h3:text-white
              prose-p:text-gray-300 prose-p:mb-4 prose-p:leading-relaxed
              prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-white prose-strong:font-semibold
              prose-ul:mb-4 prose-ul:list-disc prose-ul:pl-6 prose-ul:text-gray-300
              prose-ol:mb-4 prose-ol:list-decimal prose-ol:pl-6 prose-ol:text-gray-300
              prose-li:text-gray-300 prose-li:mb-2
              prose-code:text-pink-400 prose-code:bg-gray-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-blockquote:border-l-4 prose-blockquote:border-indigo-400 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-300
              [&>*]:text-gray-300"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        {/* Footer CTA */}
        <div className="mt-12 text-center">
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

export default BlogPost;
