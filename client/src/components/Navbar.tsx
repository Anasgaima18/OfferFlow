import React, { useState, useEffect } from 'react';
import { Menu, X, Zap, LogOut, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/cn';
import { buttonStyles } from '../lib/buttonStyles';

const SCROLL_HIDE_THRESHOLD = 80;

const Navbar: React.FC = () => {
  const [navState, setNavState] = useState({ isScrolled: false, visible: true });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastScrollY = React.useRef(0);
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const { isScrolled, visible } = navState;

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      const nextVisible = y > SCROLL_HIDE_THRESHOLD ? y <= lastScrollY.current : true;
      const nextIsScrolled = y > 20;
      setNavState((current) =>
        current.isScrolled === nextIsScrolled && current.visible === nextVisible
          ? current
          : { isScrolled: nextIsScrolled, visible: nextVisible }
      );
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const publicLinks = [
    { to: '/features', label: 'Features' },
    { to: '/pricing', label: 'Pricing' },
  ];

  const authLinks = [
    { to: '/interview-setup', label: 'Interview' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ];

  const navLinks = isAuthenticated ? authLinks : publicLinks;

  return (
    <m.nav
      initial={false}
      animate={{ y: visible ? 0 : '-100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 left-0 w-full z-50 px-3 sm:px-4 pt-3 sm:pt-4"
      aria-label="Main navigation"
    >
      <m.div
        initial={false}
        animate={{
          borderColor: isScrolled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)',
          boxShadow: isScrolled ? '0 16px 60px rgba(0,0,0,0.35)' : 'none',
        }}
        className={cn(
          'max-w-7xl mx-auto rounded-[1.6rem] border backdrop-blur-2xl',
          isScrolled ? 'bg-black/65' : 'bg-black/30',
        )}>
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2 group">
          <m.div
            className="w-10 h-10 rounded-2xl border border-white/10 bg-white/6 backdrop-blur-xl text-secondary flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.12)]"
            whileHover={{ scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Zap size={20} />
          </m.div>
          <div>
            <span className="font-pixel text-xl tracking-wider text-white block leading-none">OFFERFLOW</span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-mono">Interview command system</span>
          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-2 rounded-full border border-white/6 bg-white/4 px-2 py-2">
          {navLinks.map((link) => (
            <m.div key={link.to} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to={link.to}
                className={cn(
                  'block px-4 py-2 rounded-full text-sm font-medium relative',
                  location.pathname === link.to
                    ? 'bg-white text-black shadow-[0_12px_30px_rgba(255,255,255,0.15)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/6',
                )}
              >
                {link.label}
              </Link>
            </m.div>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <Sparkles size={14} className="text-primary" />
                {user?.name?.split(' ')[0] || 'Profile'}
              </Link>
              <button
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <LogOut size={14} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link to="/signup" className={buttonStyles({ size: 'sm' })}>
                <span className="relative z-10 inline-flex items-center gap-2">Try Free</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>
      </m.div>

      {/* Mobile Menu */}
      <AnimatePresence>
      {mobileMenuOpen && (
        <m.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="md:hidden mt-2 rounded-[1.6rem] border border-white/10 bg-black/88 backdrop-blur-2xl p-6 flex flex-col space-y-4 shadow-[0_22px_60px_rgba(0,0,0,0.45)] overflow-hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'text-sm font-medium py-3 px-4 rounded-2xl transition-colors',
                location.pathname === link.to ? 'bg-white text-black' : 'text-gray-300 hover:text-white hover:bg-white/5',
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white">
                  Profile
                </Link>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-gray-300 hover:text-white text-left flex items-center gap-2 hover:bg-white/5 transition-colors"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block w-full rounded-2xl px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white">
                  Sign In
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className={buttonStyles({ size: 'sm', className: 'w-full' })}>
                  <span className="relative z-10 inline-flex items-center gap-2">Try Free</span>
                </Link>
              </>
            )}
          </div>
        </m.div>
      )}
      </AnimatePresence>
    </m.nav>
  );
};

export default Navbar;
