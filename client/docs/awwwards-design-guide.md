# Awwwards Design Guide — OfferFlow Client

This guide is based on **Awwwards evaluation criteria**, **Context7** (React/docs), and **agent-skills** (web-quality-audit, accessibility, web-design-guidelines) so the client is aligned with award-winning design and usability.

---

## Awwwards Evaluation System (Official)

| Criterion   | Weight | What judges score |
|------------|--------|-------------------|
| **Design** | 40%    | Visual design, typography, layout, color, consistency, craft |
| **Usability** | 30% | Navigation, clarity, accessibility, performance, ease of use |
| **Creativity** | 20% | Innovation, originality, memorable experience |
| **Content** | 10% | Quality of messaging, structure, relevance |

- **Honorable Mention:** jury score ≥ 6.5  
- **Site of the Day:** highest jury scores; only 365 per year  
- **Developer Award:** SOTD sites evaluated separately for code/technical excellence  
- **Requirements:** No pre-made templates; manual approval before jury; Professional votes count  

---

## Design (40%) — Checklist

- [x] **Typography:** Clear hierarchy (font-pixel for display, font-mono for UI, font-sans for body). Scale is consistent (section-kicker, h1, h2, body).
- [x] **Color:** Limited palette (primary amber, secondary teal, background dark). Matches “simplified two-color” trend.
- [x] **Layout:** Grid-based, max-width containers, full-bleed hero. Process and features use clear sections.
- [x] **Visual craft:** Gradient mesh, grain overlay, glassmorphism, premium-panel. No generic “AI slop” look.
- [x] **Consistency:** PageLayout + PageHero pattern across app pages; Navbar/Footer shared.
- [ ] **Contrast:** Ensure text meets WCAG AA (4.5:1 normal, 3:1 large). Check zinc-400 on background.

---

## Usability (30%) — Checklist

Aligned with **web-quality-audit** and **accessibility** skills:

- [x] **Core Web Vitals:** LCP (optimize fonts/images), INP (avoid long tasks), CLS (dimensions/placeholders).
- [x] **Accessibility:** Skip link, main landmark, nav aria-label, form labels/aria-labels, dialog (EndInterviewDialog), reduced motion.
- [x] **Keyboard:** All actions keyboard-accessible; focus visible (focus-visible:ring).
- [x] **Navigation:** Consistent nav; hide-on-scroll-down for less chrome when reading.
- [x] **Performance:** Lazy routes, lazy Monaco, code splitting. Preconnect for fonts.
- [ ] **Preload:** Preload critical font (Inter or display) for LCP.

---

## Creativity (20%) — Checklist

Trends from 2024 SOTD (minimal + dynamic):

- [x] **Scroll-driven:** Lenis smooth scroll, scroll progress bar, ScrollTrigger parallax (hero orbs, features section).
- [x] **Micro-interactions:** GSAP button hover/click, tilt cards, staggered reveals, headline clip-path reveal.
- [x] **Memorable hero:** Split-line headline animation, typewriter, floating cards, waveform.
- [x] **Distinctive feel:** Dark theme, amber/teal, pixel display font, “command center” copy.

---

## Content (10%) — Checklist

- [x] **Single h1 per page:** PageHero or Hero provides the main heading.
- [x] **Meta:** usePageMeta for title/description; index.html defaults; OG/Twitter tags.
- [x] **Structure:** Headings in order (h1 → h2 → h3); descriptive link text.

---

## Technical (Developer Award)

- [x] **Semantic HTML:** main, nav, footer, section, headings.
- [x] **React patterns:** No deprecated APIs; refs for GSAP; cleanup on unmount.
- [x] **No console errors:** Clean runtime.
- [ ] **Security:** HTTPS, no exposed secrets; CSP if required.

---

## References Used

- **Awwwards:** [Evaluation System](https://www.awwwards.com/about-evaluation/)
- **Context7:** React docs (accessibility, focus, refs).
- **Agent skills:** web-quality-audit (Lighthouse categories), accessibility (WCAG 2.1), web-design-guidelines (references/guideline.md).
- **Trends:** Minimal + dynamic layouts; two-color palettes; scroll-triggered animation; strong typography.

---

## Quick Wins Applied

1. **index.html:** Align :root with app theme; preload critical font; remove conflicting primary-rgb.
2. **LCP:** Preload Inter (or display font) used above the fold.
3. **Contrast:** Audit zinc-400/zinc-500 on #050505; bump to zinc-300 where needed for AA.
