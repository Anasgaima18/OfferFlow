import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Github, Twitter, Linkedin } from 'lucide-react';

const Footer: React.FC = () => {
    return (
        <footer className="border-t border-white/10 py-16">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid md:grid-cols-4 gap-12">
                    
                    {/* Brand */}
                    <div className="col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4">
                            <Zap size={20} className="text-secondary" />
                            <span className="font-pixel text-lg tracking-wider">OFFERFLOW</span>
                        </Link>
                        <p className="text-gray-500 text-sm font-mono leading-relaxed">
                            Master your technical interviews with AI-powered mock sessions and real-time feedback.
                        </p>
                    </div>

                    {/* Product */}
                    <div className="col-span-1">
                        <h4 className="font-mono text-sm text-gray-400 uppercase tracking-wider mb-4">Product</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link to="/features" className="text-gray-500 hover:text-white transition-colors">Features</Link></li>
                            <li><Link to="/pricing" className="text-gray-500 hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link to="/leaderboard" className="text-gray-500 hover:text-white transition-colors">Leaderboard</Link></li>
                            <li><Link to="/dashboard" className="text-gray-500 hover:text-white transition-colors">Dashboard</Link></li>
                        </ul>
                    </div>
                  
                    {/* Resources */}
                    <div className="col-span-1">
                        <h4 className="font-mono text-sm text-gray-400 uppercase tracking-wider mb-4">Resources</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link to="/blog" className="text-gray-500 hover:text-white transition-colors">Blog</Link></li>
                            <li><Link to="/tips" className="text-gray-500 hover:text-white transition-colors">Interview Tips</Link></li>
                            <li><Link to="/questions" className="text-gray-500 hover:text-white transition-colors">Question Bank</Link></li>
                            <li><Link to="/support" className="text-gray-500 hover:text-white transition-colors">Help Center</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="col-span-1">
                        <h4 className="font-mono text-sm text-gray-400 uppercase tracking-wider mb-4">Legal</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link to="/privacy" className="text-gray-500 hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="text-gray-500 hover:text-white transition-colors">Terms of Service</Link></li>
                        </ul>
                        <div className="flex gap-4 mt-6">
                            <a href="https://github.com/offerflow" aria-label="OfferFlow on Github" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                                <Github size={18} />
                            </a>
                            <a href="https://twitter.com/offerflow" aria-label="OfferFlow on Twitter" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                                <Twitter size={18} />
                            </a>
                            <a href="https://linkedin.com/company/offerflow" aria-label="OfferFlow on LinkedIn" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                                <Linkedin size={18} />
                            </a>
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
