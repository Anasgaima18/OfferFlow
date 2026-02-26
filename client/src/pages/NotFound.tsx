import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

const NotFound = () => {
  usePageMeta({
    title: '404 — Page Not Found | OfferFlow',
    description: 'The page you are looking for does not exist. Return to the OfferFlow homepage to get started with AI mock interviews.',
  });

  return (
    <div className="min-h-screen bg-background text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="font-pixel text-6xl tracking-wider text-white mb-4">404</h1>
        <p className="text-gray-400 font-mono mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <button className="btn-gradient font-mono text-sm px-6 py-3 rounded-lg inline-flex items-center gap-2">
            <Home className="w-4 h-4" />
            Back to Home
          </button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
