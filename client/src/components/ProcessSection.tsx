import React, { useRef } from 'react';
import { m } from 'framer-motion';
import { MessageSquare, Code2, TrendingUp } from 'lucide-react';
import { useScrollReveal } from '../hooks/useAnimations';

const ProcessSection: React.FC = () => {
    const headerRef = useRef<HTMLDivElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useScrollReveal(headerRef, { y: 28, duration: 0.75, start: 'top 88%' });
    useScrollReveal(gridRef, { selector: '.process-card', stagger: 0.14, y: 32, duration: 0.7, start: 'top 85%' });

    const steps = [
        {
            id: '01',
            title: 'TALK',
            description: 'Answer behavioral questions just like in a real interview. Speak naturally and get comfortable.',
            icon: <MessageSquare className="w-6 h-6" />,
            color: 'bg-blue-500'
        },
        {
            id: '02',
            title: 'CODE',
            description: 'Solve technical problems on our collaborative code editor. Run test cases and optimize your solution.',
            icon: <Code2 className="w-6 h-6" />,
            color: 'bg-primary'
        },
        {
            id: '03',
            title: 'GROW',
            description: 'Receive detailed feedback on your performance, including communication style and code efficiency.',
            icon: <TrendingUp className="w-6 h-6" />,
            color: 'bg-secondary'
        }
    ];

    return (
        <section id="process" className="py-24 bg-surface relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div ref={headerRef} className="mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 font-mono">THE PROCESS</h2>
                    <p className="text-gray-400 max-w-xl">Simple, effective, and designed to get you hired.</p>
                </div>

                <div ref={gridRef} className="grid md:grid-cols-3 gap-8 relative">
                    {/* Connector Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-zinc-800 -z-10" />

                    {steps.map((step) => (
                        <m.div
                            key={step.id}
                            className="process-card bg-background border border-zinc-800 p-8 rounded-2xl relative group hover:border-zinc-700 transition-colors"
                            whileHover={{ y: -4 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        >
                            <m.div
                                className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center text-black mb-6 shadow-lg group-hover:scale-110 transition-transform`}
                                whileHover={{ scale: 1.1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                            >
                                {step.icon}
                            </m.div>
                            <div className="absolute top-8 right-8 text-4xl font-bold text-zinc-900 font-mono select-none">
                                {step.id}
                            </div>
                            <h3 className="text-2xl font-bold mb-3 font-mono">{step.title}</h3>
                            <p className="text-gray-400 leading-relaxed">
                                {step.description}
                            </p>
                        </m.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProcessSection;
