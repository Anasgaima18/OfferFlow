import React, { useState, useEffect } from 'react';
import { Menu, X, Zap, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
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
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">

        {/* Logo */}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2 group">
          <div className="text-secondary">
            <Zap size={24} className="group-hover:scale-110 transition-transform" />
          </div>
          <span className="font-pixel text-xl tracking-wider text-white">OFFERFLOW</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-secondary transition-all group-hover:w-full" />
            </Link>
          ))}

          {isAuthenticated ? (
            <>
              <Link to="/profile" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                {user?.name?.split(' ')[0] || 'Profile'}
              </Link>
              <button
                onClick={logout}
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1"
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
              <Link to="/signup">
                <button className="btn-gradient font-mono text-sm">
                  Try Free
                </button>
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-lg border-b border-white/10 p-6 flex flex-col space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-gray-300 hover:text-white py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full py-2 text-sm font-medium text-gray-300 hover:text-white text-left">
                    Profile
                  </button>
                </Link>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full py-2 text-sm font-medium text-gray-300 hover:text-white text-left flex items-center gap-2"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full py-2 text-sm font-medium text-gray-300 hover:text-white">
                    Sign In
                  </button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <button className="btn-gradient w-full font-mono text-sm">
                    Try Free
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
