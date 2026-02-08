import React from 'react';

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
    return (
        <div className="glass-card p-6 group hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg glass flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="text-secondary">{icon}</div>
            </div>
            <h3 className="font-mono text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
    );
};

export default FeatureCard;
