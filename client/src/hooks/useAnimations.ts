import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { RefObject } from 'react';

// Register global plugins if any (e.g. ScrollTrigger later on, if needed)

export const useFadeIn = (ref: RefObject<HTMLElement | null>, delay = 0, duration = 0.8, y = 30) => {
    useGSAP(() => {
        if (!ref.current) return;
        
        gsap.fromTo(
            ref.current,
            { opacity: 0, y },
            { opacity: 1, y: 0, duration, delay, ease: 'power3.out' }
        );
    }, { scope: ref });
};

export const useStaggerFadeIn = (ref: RefObject<HTMLElement | null>, selector: string, delay = 0, stagger = 0.1, y = 30) => {
    useGSAP(() => {
        if (!ref.current) return;
        const elements = ref.current.querySelectorAll(selector);
        if (!elements.length) return;

        gsap.fromTo(
            elements,
            { opacity: 0, y },
            { opacity: 1, y: 0, duration: 0.8, stagger, delay, ease: 'power3.out' }
        );
    }, { scope: ref });
};

export const useScaleIn = (ref: RefObject<HTMLElement | null>, delay = 0) => {
    useGSAP(() => {
        if (!ref.current) return;
        
        gsap.fromTo(
            ref.current,
            { opacity: 0, scale: 0.9 },
            { opacity: 1, scale: 1, duration: 0.8, delay, ease: 'back.out(1.7)' }
        );
    }, { scope: ref });
};
