import type { ReactNode } from 'react';

interface CapitalMetricTileProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  highlight?: boolean;
}

export function CapitalMetricTile({ icon, label, value, sub, highlight }: CapitalMetricTileProps) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground font-sans">{label}</span>
      </div>
      <span className={`font-display text-lg tracking-wide ${highlight ? 'text-primary' : ''}`}>
        {value}
      </span>
      {sub && (
        <span className="text-[10px] text-muted-foreground font-sans block">{sub}</span>
      )}
    </div>
  );
}
