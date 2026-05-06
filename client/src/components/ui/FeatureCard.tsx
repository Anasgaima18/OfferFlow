import React from 'react';

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
    return (
        <div className="glass-card group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/45 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                    background: 'radial-gradient(circle at 0% 0%, rgba(255,184,0,0.08), transparent 45%), radial-gradient(circle at 100% 100%, rgba(20,184,166,0.08), transparent 45%)',
                }}
            />
            <div className="relative z-10 w-12 h-12 rounded-xl glass flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="text-secondary">{icon}</div>
            </div>
            <h3 className="relative z-10 font-mono text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="relative z-10 text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
    );
};

export default FeatureCard;
