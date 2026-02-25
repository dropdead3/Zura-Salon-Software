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
}

export function EditorCard({ title, icon: Icon, description, headerActions, children, className }: EditorCardProps) {
  return (
    <div className={cn(
      "bg-card/80 backdrop-blur-xl border border-border/40 rounded-xl shadow-sm overflow-hidden",
      className
    )}>
      {/* Sticky frosted-glass header */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3.5 bg-card/90 backdrop-blur-md border-b border-border/30">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-display text-sm tracking-wide text-foreground truncate">{title}</h3>
            {description && (
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
      <div className="p-5 space-y-5">
        {children}
      </div>
    </div>
  );
}
