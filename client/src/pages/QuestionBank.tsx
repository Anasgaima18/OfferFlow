import { useState } from 'react';
import { Search, Loader2, Layers3 } from 'lucide-react';
import BlurFade from '../components/ui/BlurFade';
import PageHero from '../components/ui/PageHero';
import PageLayout from '../components/ui/PageLayout';
import SurfaceCard from '../components/ui/SurfaceCard';
import DataErrorAlert from '../components/ui/DataErrorAlert';
import EmptyState from '../components/ui/EmptyState';
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
    <PageLayout contentClassName="max-w-7xl">
      <PageHero
        kicker="Practice Library"
        title="QUESTION BANK"
        description="Browse curated interview questions by difficulty, company, and category. Use the bank to target weak spots before you start the next live session."
        meta={[
          { label: 'Visible Results', value: String(filtered.length) },
          { label: 'Total Results', value: String(payload?.total ?? 0) },
          { label: 'Current Page', value: `${page}/${totalPages}` },
        ]}
        aside={<div className="text-sm font-mono leading-relaxed text-zinc-300">Mix easy confidence reps with medium and hard prompts so your speed and reasoning improve together.</div>}
      />

      <BlurFade>
        <SurfaceCard className="premium-panel p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-50">
              <label htmlFor="question-bank-search" className="sr-only">Search questions</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} aria-hidden />
              <input
                id="question-bank-search"
                type="search"
                placeholder="Search questions..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-primary"
                aria-label="Search questions by keyword"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'easy', 'medium', 'hard'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDifficultyChange(d)}
                  className={`px-4 py-2 rounded-lg border capitalize ${difficultyFilter === d ? 'bg-primary text-black border-primary' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <label htmlFor="question-bank-category" className="sr-only">Filter by category</label>
            <select
              id="question-bank-category"
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary"
              aria-label="Filter questions by category"
            >
              <option value="all">All Categories</option>
              {(payload?.categories ?? []).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </SurfaceCard>
      </BlurFade>

      {questionsQuery.isError && (
        <BlurFade>
          <DataErrorAlert
            message="Could not load the question bank. Check your connection and try again."
            onRetry={() => questionsQuery.refetch()}
            className="mb-8"
          />
        </BlurFade>
      )}

      {!questionsQuery.isError && (
      <BlurFade delay={0.05}>
        <SurfaceCard className="premium-panel overflow-hidden">
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
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                        Loading question bank...
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <EmptyState
                        icon={<Layers3 className="h-10 w-10" />}
                        title="No questions matched"
                        description="Try adjusting your search or filters to see more results."
                        className="rounded-none border-0 border-t border-white/8"
                      />
                    </td>
                  </tr>
                ) : filtered.map((q) => (
                  <tr key={q.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="p-4 font-medium">{q.title}</td>
                    <td className={`p-4 ${q.difficulty === 'Easy' ? 'text-green-400' : q.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>{q.difficulty}</td>
                    <td className="p-4 text-zinc-400">{q.company}</td>
                    <td className="p-4 text-zinc-400">{q.category}</td>
                    <td className="p-4 text-zinc-400">{q.acceptance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </SurfaceCard>
      </BlurFade>
      )}

      {!questionsQuery.isError && (
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
      )}
    </PageLayout>
  );
};

export default QuestionBank;
