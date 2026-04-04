import { cn } from './cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const baseStyles =
    'group relative inline-flex items-center justify-center overflow-hidden rounded-2xl border font-mono font-medium transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50';

  const variants = {
    primary:
      'border-primary/30 bg-linear-to-br from-primary via-amber-400 to-orange-400 text-black shadow-[0_16px_40px_rgba(255,184,0,0.28)] hover:shadow-[0_22px_55px_rgba(255,184,0,0.35)]',
    secondary: 'border-white/10 bg-white/5 text-white backdrop-blur-xl hover:border-white/18 hover:bg-white/10',
    ghost: 'border-transparent bg-transparent text-gray-400 hover:bg-white/5 hover:text-white',
  } as const;

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-3 text-sm',
    lg: 'px-7 py-4 text-base',
  } as const;

  return cn(baseStyles, variants[variant], sizes[size], className);
}
