import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { prefersReducedMotion } from '../../hooks/useAnimations';
import { buttonStyles } from '../../lib/buttonStyles';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    onMouseEnter,
    onMouseLeave,
    onMouseDown,
    onMouseUp,
    onClick,
    ...props
}) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const shineRef = useRef<HTMLSpanElement>(null);

    useGSAP(() => {
        const btn = buttonRef.current;
        const shine = shineRef.current;
        if (!btn || prefersReducedMotion()) return;

        const hoverIn = () => {
            gsap.to(btn, { scale: 1.02, duration: 0.28, ease: 'power2.out' });
            if (shine) {
                gsap.fromTo(shine, { x: '-130%' }, { x: '130%', duration: 0.6, ease: 'power2.inOut' });
            }
        };
        const hoverOut = () => {
            gsap.to(btn, { scale: 1, duration: 0.28, ease: 'power2.out' });
        };
        const pressDown = () => {
            gsap.to(btn, { scale: 0.97, duration: 0.08, ease: 'power2.out' });
        };
        const pressUp = () => {
            gsap.to(btn, { scale: 1, duration: 0.35, ease: 'back.out(1.4)' });
        };

        btn.addEventListener('mouseenter', hoverIn);
        btn.addEventListener('mouseleave', hoverOut);
        btn.addEventListener('mousedown', pressDown);
        btn.addEventListener('mouseup', pressUp);
        btn.addEventListener('mouseleave', pressUp);

        return () => {
            btn.removeEventListener('mouseenter', hoverIn);
            btn.removeEventListener('mouseleave', hoverOut);
            btn.removeEventListener('mousedown', pressDown);
            btn.removeEventListener('mouseup', pressUp);
            btn.removeEventListener('mouseleave', pressUp);
        };
    }, { scope: buttonRef });

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
        onMouseEnter?.(e);
    };
    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
        onMouseLeave?.(e);
    };
    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        onMouseDown?.(e);
    };
    const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
        onMouseUp?.(e);
    };
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
    };

    return (
        <button
            ref={buttonRef}
            className={buttonStyles({ variant, size, className })}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
            {...props}
        >
            {variant !== 'ghost' && (
                <span
                    ref={shineRef}
                    aria-hidden="true"
                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                    style={{ transform: 'translateX(-130%)' }}
                />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
        </button>
    );
};

export default Button;
