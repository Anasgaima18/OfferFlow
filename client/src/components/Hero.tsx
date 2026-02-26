import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const questions = [
    "Walk me through your approach...",
    "What is the time complexity?",
    "How would you optimize this?",
    "Tell me about a challenging project."
];

const Hero: React.FC = () => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [displayText, setDisplayText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        const handleTyping = () => {
            const fullText = questions[currentQuestion];

            if (!isDeleting) {
                setDisplayText(fullText.substring(0, displayText.length + 1));
                if (displayText.length === fullText.length) {
                    setTimeout(() => setIsDeleting(true), 2000);
                }
            } else {
                setDisplayText(fullText.substring(0, displayText.length - 1));
                if (displayText.length === 0) {
                    setIsDeleting(false);
                    setCurrentQuestion((prev) => (prev + 1) % questions.length);
                }
            }
        };

        const timer = setTimeout(handleTyping, isDeleting ? 50 : 100);
        return () => clearTimeout(timer);
    }, [displayText, isDeleting, currentQuestion]);

    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="text-center">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
                    >
                        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                        <span className="text-xs font-mono text-gray-300">Real FAANG-style questions</span>
                    </motion.div>

                    {/* Main Heading - Pixelated Style */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8"
                    >
                        <h1 className="font-pixel text-5xl md:text-7xl lg:text-8xl tracking-wider text-white mb-4">
                            <span className="block">READY TO ACE YOUR</span>
                            <span className="block">INTERVIEW?</span>
                        </h1>
                    </motion.div>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-4 font-mono"
                    >
                        Practice behavioral and technical rounds with
                    </motion.p>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 font-mono"
                    >
                        real FAANG-style questions. Get scored on
                    </motion.p>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 font-mono"
                    >
                        communication, problem-solving, and code quality.
                    </motion.p>

                    {/* CTA Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mb-16"
                    >
                        <Link to={isAuthenticated ? '/dashboard' : '/signup'}>
                            <button className="btn-gradient text-lg font-mono px-8 py-4 rounded-lg inline-flex items-center gap-2 group">
                                {isAuthenticated ? 'Go to Dashboard' : 'Try Your First Interview Free'}
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                    </motion.div>

                    {/* Interview Preview Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="max-w-3xl mx-auto glass-card p-8 md:p-12"
                    >
                        {/* Status Bar */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                            </div>
                            <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                                AI INTERVIEWER
                            </div>
                        </div>

                        {/* Typewriter Question */}
                        <div className="min-h-[80px] flex items-center justify-center">
                            <p className="font-pixel text-2xl md:text-3xl text-white tracking-wide">
                                "{displayText}<span className="typewriter-cursor text-secondary">_</span>"
                            </p>
                        </div>

                        {/* Audio Wave Effect */}
                        <div className="flex items-center justify-center gap-1 h-8 mt-8">
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        height: [4, 20 + (i % 5) * 6, 4],
                                    }}
                                    transition={{
                                        duration: 1.2,
                                        repeat: Infinity,
                                        delay: i * 0.05,
                                        ease: "easeInOut"
                                    }}
                                    className="w-1 rounded-full bg-linear-to-t from-secondary/30 to-secondary"
                                />
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
