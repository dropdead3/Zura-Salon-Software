import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { DotsLoader } from '@/components/ui/loaders/DotsLoader';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { AI_ASSISTANT_NAME_DEFAULT } from '@/lib/brand';

interface CommandAIAnswerCardProps {
  response: string;
  isLoading: boolean;
  error: string | null;
}

export function CommandAIAnswerCard({ response, isLoading, error }: CommandAIAnswerCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!isLoading && !response && !error) return null;

  return (
    <div className="mx-3 mt-2 mb-1 rounded-xl border border-primary/10 bg-gradient-to-br from-card to-card/60 backdrop-blur-sm p-4">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <Sparkles className={cn(
          'w-3.5 h-3.5 text-primary',
          isLoading && 'animate-pulse'
        )} />
        <span className="font-display text-[10px] font-medium text-primary uppercase tracking-wider">
          {AI_ASSISTANT_NAME_DEFAULT}
        </span>
      </div>

      {/* Loading */}
      {isLoading && !response && (
        <div className="flex items-center gap-2.5 py-1">
          <DotsLoader size="sm" className="opacity-60" />
          <span className="font-sans text-xs text-muted-foreground">
            {AI_ASSISTANT_NAME_DEFAULT} is thinking…
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="font-sans text-sm text-muted-foreground">
          I couldn't answer that right now. Please try again in a moment.
        </p>
      )}

      {/* Response (streaming or complete) */}
      {response && (
        <>
          <div className={cn(
            'prose prose-sm dark:prose-invert max-w-none font-sans transition-opacity duration-200',
            !expanded && 'line-clamp-4'
          )}>
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
          {response.length > 200 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 font-sans text-xs px-3 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors duration-150"
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
