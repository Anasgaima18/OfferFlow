
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { BookOpen, Clock, User } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

const blogPosts = [
  { id: 1, slug: 'ace-behavioral', title: 'How to Ace Behavioral Interviews', excerpt: 'Learn the STAR method.', author: 'Sarah Chen', readTime: '8 min', category: 'Behavioral', image: '🎯' },
  { id: 2, slug: 'system-design', title: 'System Design Primer', excerpt: 'Guide to system design.', author: 'Michael Ross', readTime: '15 min', category: 'System Design', image: '🏗️' },
  { id: 3, slug: 'leetcode-patterns', title: 'Top 25 LeetCode Patterns', excerpt: 'Essential patterns.', author: 'Emily Wang', readTime: '12 min', category: 'Algorithms', image: '💡' },
];

const Blog = () => {
  usePageMeta({
    title: 'Blog — OfferFlow | Interview Prep Articles & Guides',
    description: 'Read expert articles on acing behavioral interviews, system design primers, LeetCode patterns, and more from the OfferFlow team.',
  });

  return (
  <div className="min-h-screen bg-background text-white font-sans">
    <Navbar />
    <main className="pt-32 pb-24 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 flex items-center gap-3"><BookOpen className="text-primary" /> Blog</h1>
        <div className="grid md:grid-cols-2 gap-6">
          {blogPosts.map((post) => (
            <article key={post.id} className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-primary/50 transition-all">
              <div className="flex gap-4">
                <div className="text-4xl">{post.image}</div>
                <div>
                  <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">{post.category}</span>
                  <h2 className="text-xl font-bold mt-2 mb-2">{post.title}</h2>
                  <p className="text-sm text-zinc-400 mb-4">{post.excerpt}</p>
                  <div className="flex gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><User size={12} /> {post.author}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {post.readTime}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <span className="text-sm text-gray-500 flex items-center gap-1">Coming soon</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
    <Footer />
  </div>
  );
};

export default Blog;
