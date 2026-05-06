import { useId, useState } from 'react';
import { BellOff, BellRing } from 'lucide-react';

interface SwitchWithIconProps {
  label?: string;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export default function SwitchWithIcon({
  label = 'Notifications',
  defaultChecked = false,
  onCheckedChange,
}: SwitchWithIconProps) {
  const id = useId();
  const [checked, setChecked] = useState(defaultChecked);

  const handleToggle = () => {
    const next = !checked;
    setChecked(next);
    onCheckedChange?.(next);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        className={[
          'relative inline-flex h-7 w-12 items-center rounded-full border border-white/15 transition-colors',
          checked ? 'bg-primary/80' : 'bg-zinc-800',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-mono text-zinc-300">
        {label}
        {checked ? <BellOff className="h-4 w-4 text-primary" /> : <BellRing className="h-4 w-4 text-zinc-400" />}
      </label>
    </div>
  );
}
