import type { ReactNode } from 'react';
import SurfaceCard from './SurfaceCard';
import { cn } from '../../lib/cn';

interface StatTileProps {
  icon: ReactNode;
  label: string;
  value: string;
  accentClassName?: string;
}

export default function StatTile({ icon, label, value, accentClassName }: StatTileProps) {
  return (
    <SurfaceCard className="p-6 text-center">
      <div className={cn('mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5', accentClassName)}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="mt-1 text-sm text-zinc-400">{label}</div>
    </SurfaceCard>
  );
}