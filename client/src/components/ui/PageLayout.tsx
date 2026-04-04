import type { PropsWithChildren } from 'react';
import Navbar from '../Navbar';
import Footer from '../Footer';
import { cn } from '../../lib/cn';

interface PageLayoutProps extends PropsWithChildren {
  contentClassName?: string;
  mainClassName?: string;
  showFooter?: boolean;
}

export default function PageLayout({
  children,
  contentClassName,
  mainClassName,
  showFooter = true,
}: PageLayoutProps) {
  return (
    <div className="page-shell text-white font-sans">
      <Navbar />
      <div className="page-body-glow" aria-hidden="true" />
      <main id="main-content" className={cn('pt-32 pb-24 px-4 sm:px-6 lg:px-8', mainClassName)} tabIndex={-1}>
        <div className={cn('max-w-6xl mx-auto', contentClassName)}>{children}</div>
      </main>
      {showFooter ? <Footer /> : null}
    </div>
  );
}