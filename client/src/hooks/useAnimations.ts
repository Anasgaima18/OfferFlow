import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RefObject, useEffect } from 'react';
import anime from 'animejs';

gsap.registerPlugin(ScrollTrigger);

/** Prefer matching reduced motion so we can skip or shorten animations */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface RevealInViewOptions {
    delay?: number;
    duration?: number;
    y?: number;
    blur?: number;
    scale?: number;
    threshold?: number;
    once?: boolean;
}

export const useFadeIn = (ref: RefObject<HTMLElement | null>, delay = 0, duration = 0.8, y = 30) => {
    useGSAP(() => {
        if (!ref.current || prefersReducedMotion()) return;
        gsap.fromTo(
            ref.current,
            { opacity: 0, y },
            { opacity: 1, y: 0, duration, delay, ease: 'power3.out' }
        );
    }, { scope: ref });
};

export const useStaggerFadeIn = (ref: RefObject<HTMLElement | null>, selector: string, delay = 0, stagger = 0.1, y = 30) => {
    useGSAP(() => {
        if (!ref.current || prefersReducedMotion()) return;
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
        if (!ref.current || prefersReducedMotion()) return;
        gsap.fromTo(
            ref.current,
            { opacity: 0, scale: 0.9 },
            { opacity: 1, scale: 1, duration: 0.8, delay, ease: 'back.out(1.7)' }
        );
    }, { scope: ref });
};

export const useRevealInView = (
    ref: RefObject<HTMLElement | null>,
    {
        delay = 0,
        duration = 0.65,
        y = 14,
        blur = 8,
        scale = 1,
        threshold = 0.2,
        once = true,
    }: RevealInViewOptions = {},
) => {
    useGSAP(() => {
        const element = ref.current;
        if (!element || prefersReducedMotion()) return;

        gsap.set(element, {
            opacity: 0,
            y,
            scale,
            filter: `blur(${blur}px)`,
        });

        let didAnimate = false;
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (!entry?.isIntersecting || (once && didAnimate)) return;
                didAnimate = true;
                gsap.to(element, {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    filter: 'blur(0px)',
                    duration,
                    delay,
                    ease: 'power4.out',
                    overwrite: 'auto',
                });
                if (once) observer.disconnect();
            },
            { threshold },
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, { scope: ref });
};

export interface ScrollRevealOptions {
    /** CSS selector for children to stagger (e.g. '.card') */
    selector?: string;
    /** Start when element top hits this viewport position (default 'top 85%') */
    start?: string;
    /** Stagger delay between children (default 0.08) */
    stagger?: number;
    /** Y offset from (default 40) */
    y?: number;
    /** Duration per element (default 0.7) */
    duration?: number;
    /** Ease (default 'power3.out') */
    ease?: string;
    /** Once only (default true) */
    once?: boolean;
}

/** ScrollTrigger-based reveal: animates element(s) when they enter viewport */
export const useScrollReveal = (
    ref: RefObject<HTMLElement | null>,
    options: ScrollRevealOptions = {},
) => {
    const {
        selector,
        start = 'top 85%',
        stagger = 0.08,
        y = 40,
        duration = 0.7,
        ease = 'power3.out',
        once = true,
    } = options;

    useGSAP(() => {
        const el = ref.current;
        if (!el || prefersReducedMotion()) return;

        const targets = selector ? el.querySelectorAll(selector) : [el];
        if (!targets.length) return;

        gsap.set(targets, { opacity: 0, y });

        const animation = gsap.to(targets, {
            opacity: 1,
            y: 0,
            duration,
            stagger: selector ? stagger : 0,
            ease,
            overwrite: 'auto',
        });

        const trigger = ScrollTrigger.create({
            trigger: el,
            start,
            once,
            animation,
        });

        return () => trigger.kill();
    }, { scope: ref });
};

/** Premium tilt-on-hover: slight 3D rotate toward cursor (use on cards) */
export const useTilt = (
    ref: RefObject<HTMLElement | null>,
    options: { maxRotate?: number; scale?: number; perspective?: number } = {},
) => {
    const { maxRotate = 6, scale = 1.02, perspective = 1200 } = options;

    useGSAP(() => {
        const el = ref.current;
        if (!el || prefersReducedMotion()) return;

        el.style.transformStyle = 'preserve-3d';
        el.style.perspective = `${perspective}px`;

        const onMove = (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            const rotateX = -y * maxRotate;
            const rotateY = x * maxRotate;
            gsap.to(el, {
                rotateX,
                rotateY,
                scale,
                duration: 0.4,
                ease: 'power2.out',
                overwrite: 'auto',
            });
        };

        const onLeave = () => {
            gsap.to(el, {
                rotateX: 0,
                rotateY: 0,
                scale: 1,
                duration: 0.6,
                ease: 'power2.out',
            });
        };

        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
        return () => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
        };
    }, { scope: ref });
};

/** anime.js: stagger-in animation for a list of elements (respects reduced motion) */
export const useAnimeStagger = (
    ref: RefObject<HTMLElement | null>,
    selector: string,
    options: { delay?: number; duration?: number; stagger?: number; y?: number; once?: boolean } = {},
) => {
    const { delay = 0, duration = 600, stagger = 80, y = 24, once = true } = options;

    useEffect(() => {
        const el = ref.current;
        if (!el || prefersReducedMotion()) return;

        const targets = el.querySelectorAll(selector);
        if (!targets.length) return;

        let didRun = false;
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (!entry?.isIntersecting || (once && didRun)) return;
                didRun = true;
                anime({
                    targets,
                    opacity: [0, 1],
                    translateY: [y, 0],
                    duration,
                    delay: anime.stagger(stagger, { start: delay }),
                    easing: 'easeOutExpo',
                });
                if (once) observer.disconnect();
            },
            { threshold: 0.1 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref, selector, delay, duration, stagger, y, once]);
};

/** anime.js: count-up number animation (respects reduced motion) */
export const useAnimeCounter = (
    ref: RefObject<HTMLElement | null>,
    endValue: number,
    options: { duration?: number; delay?: number; once?: boolean; suffix?: string; prefix?: string } = {},
) => {
    const { duration = 1500, delay = 0, once = true, suffix = '', prefix = '' } = options;

    useEffect(() => {
        const el = ref.current;
        if (!el || prefersReducedMotion()) return;

        let didRun = false;
        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (!entry?.isIntersecting || (once && didRun)) return;
                didRun = true;
                const obj = { value: 0 };
                anime({
                    targets: obj,
                    value: endValue,
                    duration,
                    delay,
                    easing: 'easeOutExpo',
                    round: 1,
                    update: () => {
                        el.textContent = `${prefix}${obj.value}${suffix}`;
                    },
                });
                if (once) observer.disconnect();
            },
            { threshold: 0.2 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref, endValue, duration, delay, once, suffix, prefix]);
};
