import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Search, Code } from 'lucide-react';

const questions = [
  // --- Arrays & Hashing (NeetCode 150) ---
  { id: 1, title: 'Contains Duplicate', difficulty: 'Easy', company: 'Apple, Netflix, Google', category: 'Arrays', acceptance: '60%' },
  { id: 2, title: 'Valid Anagram', difficulty: 'Easy', company: 'Uber, Google', category: 'Arrays', acceptance: '63%' },
  { id: 3, title: 'Two Sum', difficulty: 'Easy', company: 'Google, Meta, Amazon', category: 'Arrays', acceptance: '49%' },
  { id: 4, title: 'Group Anagrams', difficulty: 'Medium', company: 'Amazon, Google', category: 'Arrays', acceptance: '66%' },
  { id: 5, title: 'Top K Frequent Elements', difficulty: 'Medium', company: 'Facebook, Amazon', category: 'Arrays', acceptance: '64%' },
  { id: 6, title: 'Product of Array Except Self', difficulty: 'Medium', company: 'Meta, Apple, Amazon', category: 'Arrays', acceptance: '65%' },
  { id: 7, title: 'Valid Sudoku', difficulty: 'Medium', company: 'Apple, Amazon', category: 'Arrays', acceptance: '58%' },
  { id: 8, title: 'Encode and Decode Strings', difficulty: 'Medium', company: 'Google, Meta', category: 'Arrays', acceptance: '72%' },
  { id: 9, title: 'Longest Consecutive Sequence', difficulty: 'Medium', company: 'Google, Meta', category: 'Arrays', acceptance: '47%' },
  
  // --- Two Pointers (NeetCode 150) ---
  { id: 10, title: 'Valid Palindrome', difficulty: 'Easy', company: 'Meta, Apple, Spotify', category: 'Two Pointers', acceptance: '44%' },
  { id: 11, title: 'Two Sum II - Input Array Is Sorted', difficulty: 'Medium', company: 'Amazon, Google', category: 'Two Pointers', acceptance: '60%' },
  { id: 12, title: '3Sum', difficulty: 'Medium', company: 'Facebook, Amazon', category: 'Two Pointers', acceptance: '32%' },
  { id: 13, title: 'Container With Most Water', difficulty: 'Medium', company: 'Google, Amazon', category: 'Two Pointers', acceptance: '54%' },
  { id: 14, title: 'Trapping Rain Water', difficulty: 'Hard', company: 'Amazon, Google, Goldman Sachs', category: 'Two Pointers', acceptance: '59%' },

  // --- Sliding Window (NeetCode 150) ---
  { id: 15, title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy', company: 'Amazon, Microsoft', category: 'Sliding Window', acceptance: '54%' },
  { id: 16, title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', company: 'Meta, Amazon, Microsoft', category: 'Sliding Window', acceptance: '33%' },
  { id: 17, title: 'Longest Repeating Character Replacement', difficulty: 'Medium', company: 'Google, Meta', category: 'Sliding Window', acceptance: '51%' },
  { id: 18, title: 'Permutation in String', difficulty: 'Medium', company: 'Meta, Amazon', category: 'Sliding Window', acceptance: '44%' },
  { id: 19, title: 'Minimum Window Substring', difficulty: 'Hard', company: 'Meta, Amazon', category: 'Sliding Window', acceptance: '40%' },
  { id: 20, title: 'Sliding Window Maximum', difficulty: 'Hard', company: 'Amazon, Google', category: 'Sliding Window', acceptance: '46%' },

  // --- Stack (NeetCode 150) ---
  { id: 21, title: 'Valid Parentheses', difficulty: 'Easy', company: 'Microsoft, Meta, Netflix', category: 'Stack', acceptance: '42%' },
  { id: 22, title: 'Min Stack', difficulty: 'Medium', company: 'Amazon, Apple', category: 'Stack', acceptance: '52%' },
  { id: 23, title: 'Evaluate Reverse Polish Notation', difficulty: 'Medium', company: 'Amazon, Meta', category: 'Stack', acceptance: '45%' },
  { id: 24, title: 'Generate Parentheses', difficulty: 'Medium', company: 'Google, Meta', category: 'Stack', acceptance: '72%' },
  { id: 25, title: 'Daily Temperatures', difficulty: 'Medium', company: 'Amazon, Google', category: 'Stack', acceptance: '66%' },
  { id: 26, title: 'Car Fleet', difficulty: 'Medium', company: 'Tesla, Amazon', category: 'Stack', acceptance: '43%' },
  { id: 27, title: 'Largest Rectangle in Histogram', difficulty: 'Hard', company: 'Google, Amazon', category: 'Stack', acceptance: '42%' },

  // --- Binary Search (NeetCode 150) ---
  { id: 28, title: 'Binary Search', difficulty: 'Easy', company: 'Microsoft, Apple', category: 'Binary Search', acceptance: '56%' },
  { id: 29, title: 'Search a 2D Matrix', difficulty: 'Medium', company: 'Amazon, Apple', category: 'Binary Search', acceptance: '48%' },
  { id: 30, title: 'Koko Eating Bananas', difficulty: 'Medium', company: 'Google, Meta', category: 'Binary Search', acceptance: '49%' },
  { id: 31, title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', company: 'Meta, Microsoft', category: 'Binary Search', acceptance: '48%' },
  { id: 32, title: 'Search in Rotated Sorted Array', difficulty: 'Medium', company: 'Facebook, Google', category: 'Binary Search', acceptance: '38%' },
  { id: 33, title: 'Time Based Key-Value Store', difficulty: 'Medium', company: 'Google, Amazon', category: 'Binary Search', acceptance: '53%' },
  { id: 34, title: 'Median of Two Sorted Arrays', difficulty: 'Hard', company: 'Google, Amazon', category: 'Binary Search', acceptance: '36%' },

  // --- Linked List (NeetCode 150) ---
  { id: 35, title: 'Reverse Linked List', difficulty: 'Easy', company: 'Amazon, Microsoft', category: 'Linked List', acceptance: '73%' },
  { id: 36, title: 'Merge Two Sorted Lists', difficulty: 'Easy', company: 'Apple, Microsoft, Amazon', category: 'Linked List', acceptance: '62%' },
  { id: 37, title: 'Reorder List', difficulty: 'Medium', company: 'Uber, Microsoft', category: 'Linked List', acceptance: '53%' },
  { id: 38, title: 'Remove Nth Node From End of List', difficulty: 'Medium', company: 'Amazon, Apple', category: 'Linked List', acceptance: '40%' },
  { id: 39, title: 'Copy List with Random Pointer', difficulty: 'Medium', company: 'Meta, Amazon', category: 'Linked List', acceptance: '51%' },
  { id: 40, title: 'Add Two Numbers', difficulty: 'Medium', company: 'Amazon, Meta', category: 'Linked List', acceptance: '40%' },
  { id: 41, title: 'Linked List Cycle', difficulty: 'Easy', company: 'Amazon, Spotify', category: 'Linked List', acceptance: '47%' },
  { id: 42, title: 'Find the Duplicate Number', difficulty: 'Medium', company: 'Google, Amazon', category: 'Linked List', acceptance: '59%' },
  { id: 43, title: 'LRU Cache', difficulty: 'Medium', company: 'All FAANG', category: 'Linked List', acceptance: '41%' },
  { id: 44, title: 'Merge k Sorted Lists', difficulty: 'Hard', company: 'Facebook, Google', category: 'Linked List', acceptance: '49%' },
  { id: 45, title: 'Reverse Nodes in k-Group', difficulty: 'Hard', company: 'Meta, Google', category: 'Linked List', acceptance: '53%' },

  // --- Trees (NeetCode 150) ---
  { id: 46, title: 'Invert Binary Tree', difficulty: 'Easy', company: 'Google, Amazon, Homebrew', category: 'Trees', acceptance: '75%' },
  { id: 47, title: 'Maximum Depth of Binary Tree', difficulty: 'Easy', company: 'LinkedIn, Amazon', category: 'Trees', acceptance: '73%' },
  { id: 48, title: 'Diameter of Binary Tree', difficulty: 'Easy', company: 'Google, Meta', category: 'Trees', acceptance: '57%' },
  { id: 49, title: 'Balanced Binary Tree', difficulty: 'Easy', company: 'Amazon, Apple', category: 'Trees', acceptance: '48%' },
  { id: 50, title: 'Same Tree', difficulty: 'Easy', company: 'Google, Apple', category: 'Trees', acceptance: '57%' },
  { id: 51, title: 'Subtree of Another Tree', difficulty: 'Easy', company: 'Amazon, Meta', category: 'Trees', acceptance: '46%' },
  { id: 52, title: 'Lowest Common Ancestor of a BST', difficulty: 'Medium', company: 'Amazon, Meta', category: 'Trees', acceptance: '60%' },
  { id: 53, title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', company: 'Amazon, Microsoft', category: 'Trees', acceptance: '63%' },
  { id: 54, title: 'Binary Tree Right Side View', difficulty: 'Medium', company: 'Meta, Amazon', category: 'Trees', acceptance: '61%' },
  { id: 55, title: 'Count Good Nodes in Binary Tree', difficulty: 'Medium', company: 'Google, Microsoft', category: 'Trees', acceptance: '72%' },
  { id: 56, title: 'Validate Binary Search Tree', difficulty: 'Medium', company: 'Meta, Amazon, Bloomberg', category: 'Trees', acceptance: '32%' },
  { id: 57, title: 'Kth Smallest Element in a BST', difficulty: 'Medium', company: 'Uber, Google', category: 'Trees', acceptance: '69%' },
  { id: 58, title: 'Construct Binary Tree from Preorder and Inorder', difficulty: 'Medium', company: 'Amazon, Microsoft', category: 'Trees', acceptance: '61%' },
  { id: 59, title: 'Binary Tree Maximum Path Sum', difficulty: 'Hard', company: 'Google, Meta', category: 'Trees', acceptance: '39%' },
  { id: 60, title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', company: 'Uber, Google', category: 'Trees', acceptance: '55%' },

  // --- Tries (NeetCode 150) ---
  { id: 61, title: 'Implement Trie (Prefix Tree)', difficulty: 'Medium', company: 'Google, Amazon', category: 'Tries', acceptance: '62%' },
  { id: 62, title: 'Design Add and Search Words DS', difficulty: 'Medium', company: 'Meta, Uber', category: 'Tries', acceptance: '43%' },
  { id: 63, title: 'Word Search II', difficulty: 'Hard', company: 'Microsoft, Google', category: 'Tries', acceptance: '36%' },

  // --- Heap / Priority Queue (NeetCode 150) ---
  { id: 64, title: 'Kth Largest Element in a Stream', difficulty: 'Easy', company: 'Amazon, Google', category: 'Heap', acceptance: '55%' },
  { id: 65, title: 'Last Stone Weight', difficulty: 'Easy', company: 'Amazon, Google', category: 'Heap', acceptance: '64%' },
  { id: 66, title: 'K Closest Points to Origin', difficulty: 'Medium', company: 'Meta, Amazon', category: 'Heap', acceptance: '66%' },
  { id: 67, title: 'Kth Largest Element in an Array', difficulty: 'Medium', company: 'Facebook, Amazon', category: 'Heap', acceptance: '66%' },
  { id: 68, title: 'Task Scheduler', difficulty: 'Medium', company: 'Meta, Google', category: 'Heap', acceptance: '55%' },
  { id: 69, title: 'Design Twitter', difficulty: 'Medium', company: 'Twitter, Amazon', category: 'Heap', acceptance: '37%' },
  { id: 70, title: 'Find Median from Data Stream', difficulty: 'Hard', company: 'Google, Amazon', category: 'Heap', acceptance: '51%' },
  
  // --- FAANG Recent Extras ---
  { id: 71, title: 'String to Integer (atoi)', difficulty: 'Medium', company: 'Meta, Amazon', category: 'Strings', acceptance: '16%' },
  { id: 72, title: 'Integer to English Words', difficulty: 'Hard', company: 'Meta, Amazon', category: 'Strings', acceptance: '29%' },
  { id: 73, title: 'Accounts Merge', difficulty: 'Medium', company: 'Meta, Google', category: 'Graph', acceptance: '56%' },
  { id: 74, title: 'Is Graph Bipartite?', difficulty: 'Medium', company: 'Meta', category: 'Graph', acceptance: '51%' },
  { id: 75, title: 'Letter Combinations of a Phone Number', difficulty: 'Medium', company: 'Meta, Amazon', category: 'Backtracking', acceptance: '56%' },
  { id: 76, title: 'Pow(x, n)', difficulty: 'Medium', company: 'Meta, Google', category: 'Math', acceptance: '33%' },
  { id: 77, title: 'Continuous Subarray Sum', difficulty: 'Medium', company: 'Meta, Amazon', category: 'Arrays', acceptance: '28%' },
  { id: 78, title: 'Meeting Rooms II', difficulty: 'Medium', company: 'Google, Meta', category: 'Intervals', acceptance: '50%' },
  { id: 79, title: 'Alien Dictionary', difficulty: 'Hard', company: 'Meta, Google', category: 'Graph', acceptance: '35%' },
  { id: 80, title: 'Number of Connected Components', difficulty: 'Medium', company: 'Google, Meta', category: 'Graph', acceptance: '58%' },
  { id: 81, title: 'Word Ladder', difficulty: 'Hard', company: 'Google, Amazon', category: 'Graph', acceptance: '37%' },
  { id: 82, title: 'First Bad Version', difficulty: 'Easy', company: 'Meta, Google', category: 'Binary Search', acceptance: '43%' },
];

const QuestionBank = () => {
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const filtered = questions.filter(q => 
    q.title.toLowerCase().includes(search.toLowerCase()) &&
    (difficultyFilter === 'all' || q.difficulty.toLowerCase() === difficultyFilter)
  );

  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Navbar />
      <main className="pt-32 pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 flex items-center gap-3"><Code className="text-primary" /> Question Bank</h1>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'easy', 'medium', 'hard'].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficultyFilter(d)}
                  className={`px-4 py-2 rounded-lg border capitalize ${difficultyFilter === d ? 'bg-primary text-black border-primary' : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'}`}
                >
                  {d}
                </button>
              ))}
            </div>
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
                {filtered.map((q) => (
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default QuestionBank;
