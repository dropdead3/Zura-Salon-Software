import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface CommandAIAnswerCardProps {
  response: string;
  isLoading: boolean;
  error: string | null;
}

export function CommandAIAnswerCard({ response, isLoading, error }: CommandAIAnswerCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!isLoading && !response && !error) return null;

  return (
    <div className="mx-3 mt-2 mb-1 rounded-lg border border-border/50 bg-card-inner p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3 text-primary" />
        <span className="font-sans text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          AI Answer
        </span>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      )}

      {error && (
        <p className="font-sans text-sm text-destructive">{error}</p>
      )}

      {response && (
        <>
          <div className={cn(
            'prose prose-sm dark:prose-invert max-w-none font-sans',
            !expanded && 'line-clamp-4'
          )}>
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
          {response.length > 200 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 font-sans text-xs text-primary hover:underline"
              tabIndex={-1}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
