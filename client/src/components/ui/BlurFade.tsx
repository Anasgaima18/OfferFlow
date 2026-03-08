import { motion } from 'framer-motion';
import type { PropsWithChildren } from 'react';
import { cn } from '../../lib/cn';

interface BlurFadeProps extends PropsWithChildren {
  className?: string;
  delay?: number;
  y?: number;
}

export default function BlurFade({ children, className, delay = 0, y = 14 }: BlurFadeProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}