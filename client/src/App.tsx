import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useRef } from 'react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { AuthProvider } from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import AnimatedLayout from './components/AnimatedLayout';
import { useScaleIn, useStaggerFadeIn } from './hooks/useAnimations';

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
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
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
const NotFound = lazy(() => import('./pages/NotFound'));

import { Toaster } from 'sonner';
import { SmoothScrollProvider } from './components/SmoothScrollProvider';
import ScrollProgress from './components/ScrollProgress';
import { setBrowserAttribute, trackPageAction } from './lib/newRelicBrowser';

const RouteTelemetry = () => {
  const location = useLocation();

  useEffect(() => {
    setBrowserAttribute('route.path', location.pathname, true);
    trackPageAction('RouteChange', {
      path: location.pathname,
      search: location.search || 'none',
    });
  }, [location.pathname, location.search]);

  return null;
};

const PageLoader = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);

  useScaleIn(cardRef, 0.08);
  useStaggerFadeIn(barsRef, '.loader-bar', 0.12, 0.07, 18);

  return (
    <m.div
      className="min-h-screen bg-background flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <m.div
        ref={cardRef}
        className="premium-panel w-full max-w-sm rounded-[2rem] border border-white/10 bg-black/45 p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.4)]"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" role="status" aria-label="Loading page" />
        </div>
        <h2 className="font-pixel text-2xl tracking-[0.08em] text-white">LOADING</h2>
        <p className="mt-3 text-sm font-mono text-zinc-400">Preparing the next surface.</p>
        <div ref={barsRef} className="mt-6 flex items-end justify-center gap-2 h-10">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`loader-bar-${index}`}
              className="loader-bar w-2 rounded-full bg-linear-to-t from-primary/40 to-secondary/70"
              style={{ height: `${18 + index * 5}px` }}
            />
          ))}
        </div>
      </m.div>
    </m.div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <LazyMotion features={domAnimation}>
        <Router>
          <AuthProvider>
          <RouteTelemetry />
          <SmoothScrollProvider>
            <div className="min-h-screen bg-background text-white selection:bg-primary/30">
              <ScrollProgress />
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-black focus:font-medium focus:outline-none focus:ring-2 focus:ring-white"
              >
                Skip to main content
              </a>
              <Toaster richColors position="top-center" />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route element={<AnimatedLayout />}>
                    {/* Public Routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/support" element={<Support />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/features" element={<Features />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/oauth/callback" element={<OAuthCallback />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
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

                    {/* 404 Catch-All */}
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </Suspense>
            </div>
          </SmoothScrollProvider>
          </AuthProvider>
        </Router>
      </LazyMotion>
    </ErrorBoundary>
  );
}

export default App;
