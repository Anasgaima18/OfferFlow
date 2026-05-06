import { ButtonHTMLAttributes, MouseEvent, ReactNode, useRef, useState } from 'react';

interface HoverGlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
}

export default function HoverGlowButton({
  children,
  className = '',
  disabled = false,
  type = 'button',
  ...props
}: HoverGlowButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [glow, setGlow] = useState({ x: 50, y: 50, visible: false });

  const handleMouseMove = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setGlow({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      visible: true,
    });
  };

  return (
    <button
      ref={buttonRef}
      type={type}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setGlow((prev) => ({ ...prev, visible: true }))}
      onMouseLeave={() => setGlow((prev) => ({ ...prev, visible: false }))}
      className={[
        'relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl',
        'border border-primary/40 bg-zinc-950 px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em]',
        'text-white transition-all duration-300',
        'hover:border-primary/70 hover:shadow-[0_0_24px_rgba(255,184,0,0.35)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      ].join(' ')}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition-all duration-300"
        style={{
          left: glow.x,
          top: glow.y,
          width: glow.visible ? 180 : 0,
          height: glow.visible ? 180 : 0,
          background: 'radial-gradient(circle, rgba(255,184,0,0.35) 0%, rgba(255,184,0,0) 70%)',
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
