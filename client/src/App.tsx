import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded pages
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const InterviewRoom = lazy(() => import('./pages/InterviewRoom'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Support = lazy(() => import('./pages/Support'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Features = lazy(() => import('./pages/Features'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Profile = lazy(() => import('./pages/Profile'));
const InterviewSetup = lazy(() => import('./pages/InterviewSetup'));
const Achievements = lazy(() => import('./pages/Achievements'));
const DailyChallenge = lazy(() => import('./pages/DailyChallenge'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Blog = lazy(() => import('./pages/Blog'));
const QuestionBank = lazy(() => import('./pages/QuestionBank'));
const Tips = lazy(() => import('./pages/Tips'));
const Terms = lazy(() => import('./pages/Terms'));
const ResumeReview = lazy(() => import('./pages/ResumeReview'));
const FeedbackReport = lazy(() => import('./pages/FeedbackReport'));

import { Toaster } from 'sonner';

const PageLoader = () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading page" />
    </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <div className="min-h-screen bg-background text-white selection:bg-primary/30">
            <Toaster richColors position="top-center" />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/support" element={<Support />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/features" element={<Features />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/tips" element={<Tips />} />
                <Route path="/terms" element={<Terms />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/interview/:id" element={<ProtectedRoute><InterviewRoom /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/interview-setup" element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
                <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
                <Route path="/daily-challenge" element={<ProtectedRoute><DailyChallenge /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                <Route path="/questions" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
                <Route path="/resume-review" element={<ProtectedRoute><ResumeReview /></ProtectedRoute>} />
                <Route path="/feedback/:id" element={<ProtectedRoute><FeedbackReport /></ProtectedRoute>} />
              </Routes>
            </Suspense>
          </div>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
