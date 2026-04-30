import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorCardProps {
  title: string;
  icon?: LucideIcon;
  description?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * Compact header — drops the description (the toolbar breadcrumb already
   * names this surface) and uses a tighter single-line band. Defaults true
   * because the canonical label lives in the toolbar above.
   */
  compact?: boolean;
}

export function EditorCard({ title, icon: Icon, description, headerActions, children, className, compact = true }: EditorCardProps) {
  const showDescription = !!description && !compact;
  return (
    <div className={cn(
      "bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-sm overflow-hidden",
      className
    )}>
      {/* Sticky frosted-glass header */}
      <div
        className={cn(
          "sticky top-0 z-10 flex items-center justify-between gap-2 px-4 bg-card/90 backdrop-blur-md border-b border-border/40",
          compact ? "py-2" : "py-3"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-display text-sm tracking-wide text-foreground truncate">{title}</h3>
            {showDescription && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
            )}
          </div>
        </div>
        {headerActions && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {headerActions}
          </div>
        )}
      </div>
      {/* Content */}
      <div className="p-4 space-y-4 max-w-full box-border overflow-hidden">
        {children}
      </div>
    </div>
  );
}
