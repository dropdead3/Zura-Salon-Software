import { ReactNode, useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SectionPreviewWrapperProps {
  children: ReactNode;
  className?: string;
}

export function SectionPreviewWrapper({ children, className }: SectionPreviewWrapperProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Preview Controls */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <span className="text-sm font-medium text-muted-foreground">Live Preview</span>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant="ghost"
            size={tokens.button.inline}
            className={cn(
              "h-7 px-2",
              viewMode === 'desktop' && "bg-background shadow-sm"
            )}
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size={tokens.button.inline}
            className={cn(
              "h-7 px-2",
              viewMode === 'mobile' && "bg-background shadow-sm"
            )}
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 bg-muted/30 rounded-xl border border-border overflow-hidden">
        <div 
          className={cn(
            "mx-auto transition-all duration-300 origin-top overflow-hidden h-full",
            viewMode === 'mobile' ? "max-w-[390px]" : "w-full"
          )}
        >
          <div 
            className={cn(
              "origin-top-left transition-transform duration-300",
              viewMode === 'desktop' ? "scale-[0.5]" : "scale-[0.65]"
            )}
            style={{
              width: viewMode === 'desktop' ? '200%' : '153.8%',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
