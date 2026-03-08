import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Search, Code, Loader2 } from 'lucide-react';
import { useQuestionsQuery } from '../hooks/useContentQueries';

const QuestionBank = () => {
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);

  const questionsQuery = useQuestionsQuery({
    search,
    difficulty: difficultyFilter,
    category: categoryFilter,
    page,
    pageSize: 20,
  });

  const payload = questionsQuery.data;
  const filtered = payload?.questions ?? [];
  const totalPages = payload ? Math.max(1, Math.ceil(payload.total / payload.pageSize)) : 1;

  const handleDifficultyChange = (difficulty: string) => {
    setDifficultyFilter(difficulty);
    setPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setCategoryFilter(category);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />
      <main className="pt-32 pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 flex items-center gap-3"><Code className="text-primary" /> Question Bank</h1>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="relative flex-1 min-w-50">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Search questions..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'easy', 'medium', 'hard'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleDifficultyChange(d)}
                  className={`px-4 py-2 rounded-lg border capitalize ${difficultyFilter === d ? 'bg-primary text-black border-primary' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
            >
              <option value="all">All Categories</option>
              {(payload?.categories ?? []).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-900/80 text-left text-sm text-zinc-400">
                <tr>
                  <th className="p-4">Title</th>
                  <th className="p-4">Difficulty</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Acceptance</th>
                </tr>
              </thead>
              <tbody>
                {questionsQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-zinc-400">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading question bank...
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-zinc-400">
                      No questions matched the current filters.
                    </td>
                  </tr>
                ) : filtered.map((q) => (
                  <tr key={q.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer">
                    <td className="p-4 font-medium">{q.title}</td>
                    <td className={`p-4 ${q.difficulty === 'Easy' ? 'text-green-400' : q.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>{q.difficulty}</td>
                    <td className="p-4 text-zinc-400">{q.company}</td>
                    <td className="p-4 text-zinc-400">{q.category}</td>
                    <td className="p-4 text-zinc-400">{q.acceptance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6 text-sm text-zinc-400">
            <span>
              Showing {filtered.length} of {payload?.total ?? 0} questions
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1 || questionsQuery.isLoading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="px-4 py-2 rounded-lg border border-zinc-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || questionsQuery.isLoading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="px-4 py-2 rounded-lg border border-zinc-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default QuestionBank;
