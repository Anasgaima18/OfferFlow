import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import PageLayout from '../components/ui/PageLayout';
import SurfaceCard from '../components/ui/SurfaceCard';

const NotFound = () => {
  usePageMeta({
    title: '404 — Page Not Found | OfferFlow',
    description: 'The page you are looking for does not exist. Return to the OfferFlow homepage to get started with AI mock interviews.',
  });

  return (
    <PageLayout showFooter={false} mainClassName="min-h-screen flex items-center justify-center px-4">
      <SurfaceCard className="premium-panel max-w-xl w-full p-8 md:p-10 text-center border-white/10">
        <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-red-500/10 border border-red-500/15 flex items-center justify-center" aria-hidden="true">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <div className="section-kicker mb-5 mx-auto w-fit">Navigation Error</div>
        <h1 className="font-pixel text-7xl tracking-[0.08em] text-white mb-4">404</h1>
        <p className="text-gray-400 font-mono mb-8 leading-relaxed">
          The page you were looking for is missing, moved, or no longer part of the current route map.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-linear-to-br from-primary via-amber-400 to-orange-400 px-7 py-4 text-base font-mono font-medium text-black shadow-[0_16px_40px_rgba(255,184,0,0.28)] transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <Home className="w-4 h-4" aria-hidden />
          Back to Home
        </Link>
      </SurfaceCard>
    </PageLayout>
  );
};

export default NotFound;
