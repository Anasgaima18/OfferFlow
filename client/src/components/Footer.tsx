import React from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { Zap, Github, Twitter, Linkedin, ArrowRight } from 'lucide-react';
import SurfaceCard from './ui/SurfaceCard';
import { buttonStyles } from '../lib/buttonStyles';

const linkItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: (i: number) => ({ delay: i * 0.05, duration: 0.3 }),
};

const Footer: React.FC = () => {
    return (
        <footer className="relative border-t border-white/10 py-16 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4">
                <SurfaceCard className="mb-12 p-8 md:p-10 border-white/10 bg-white/4" interactive>
                    <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center">
                        <div>
                            <div className="section-kicker mb-4">OfferFlow Premium Prep</div>
                            <h3 className="font-pixel text-4xl tracking-wider text-white mb-3">TURN PRACTICE INTO SIGNAL</h3>
                            <p className="text-zinc-400 font-mono max-w-2xl leading-relaxed">
                                Run realistic reps, review the miss, and turn your next interview into an execution problem instead of a confidence problem.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link to="/signup" className={buttonStyles({ size: 'lg' })}>
                                <span className="relative z-10 inline-flex items-center gap-2">Start Free <ArrowRight className="w-4 h-4" /></span>
                            </Link>
                            <Link to="/features" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
                                <span className="relative z-10 inline-flex items-center gap-2">Explore Platform</span>
                            </Link>
                        </div>
                    </div>
                </SurfaceCard>
                <div className="grid md:grid-cols-4 gap-12">
                    
                    {/* Brand */}
                    <div className="col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/6 backdrop-blur-xl text-secondary flex items-center justify-center">
                                <Zap size={18} className="text-secondary" />
                            </div>
                            <div>
                                <span className="font-pixel text-lg tracking-wider block">OFFERFLOW</span>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono">Interview operating system</span>
                            </div>
                        </Link>
                        <p className="text-gray-500 text-sm font-mono leading-relaxed">
                            Master your technical interviews with AI-powered mock sessions and real-time feedback.
                        </p>
                    </div>

                    {/* Product */}
                    <m.div className="col-span-1" initial="initial" whileInView="animate" viewport={{ once: true }} variants={{ animate: { transition: { staggerChildren: 0.06 } } }}>
                        <h4 className="font-mono text-sm text-gray-400 uppercase tracking-wider mb-4">Product</h4>
                        <ul className="space-y-3 text-sm">
                            {['/features', '/pricing', '/leaderboard', '/dashboard'].map((to, i) => (
                                <m.li key={to} variants={linkItem} transition={linkItem.transition(i)}>
                                    <Link to={to} className="text-gray-500 hover:text-white transition-colors inline-block">
                                        {to === '/features' ? 'Features' : to === '/pricing' ? 'Pricing' : to === '/leaderboard' ? 'Leaderboard' : 'Dashboard'}
                                    </Link>
                                </m.li>
                            ))}
                        </ul>
                    </m.div>
                  
                    {/* Resources */}
                    <m.div className="col-span-1" initial="initial" whileInView="animate" viewport={{ once: true }} variants={{ animate: { transition: { staggerChildren: 0.06 } } }}>
                        <h4 className="font-mono text-sm text-gray-400 uppercase tracking-wider mb-4">Resources</h4>
                        <ul className="space-y-3 text-sm">
                            {[{ to: '/blog', label: 'Blog' }, { to: '/tips', label: 'Interview Tips' }, { to: '/questions', label: 'Question Bank' }, { to: '/support', label: 'Help Center' }].map(({ to, label }, i) => (
                                <m.li key={to} variants={linkItem} transition={linkItem.transition(i)}>
                                    <Link to={to} className="text-gray-500 hover:text-white transition-colors inline-block">{label}</Link>
                                </m.li>
                            ))}
                        </ul>
                    </m.div>

                    {/* Legal */}
                    <div className="col-span-1">
                        <h4 className="font-mono text-sm text-gray-400 uppercase tracking-wider mb-4">Legal</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link to="/privacy" className="text-gray-500 hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="text-gray-500 hover:text-white transition-colors">Terms of Service</Link></li>
                        </ul>
                        <div className="flex gap-4 mt-6">
                            {[
                                { href: 'https://github.com/offerflow', Icon: Github, label: 'OfferFlow on Github' },
                                { href: 'https://twitter.com/offerflow', Icon: Twitter, label: 'OfferFlow on Twitter' },
                                { href: 'https://linkedin.com/company/offerflow', Icon: Linkedin, label: 'OfferFlow on LinkedIn' },
                            ].map(({ href, Icon, label }) => (
                                <m.a
                                    key={href}
                                    href={href}
                                    aria-label={label}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-2xl border border-white/8 bg-white/4 text-gray-500 hover:text-white transition-colors flex items-center justify-center"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Icon size={18} />
                                </m.a>
                            ))}
                        </div>
                    </div>

                </div>
                
                <div className="mt-12 pt-8 border-t border-white/5 text-center">
                    <p className="text-gray-600 text-sm font-mono">
                        © {new Date().getFullYear()} OfferFlow. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
