import React, { useState } from 'react';
import { ZuraZIcon } from '@/components/icons/ZuraZIcon';
import { DotsLoader } from '@/components/ui/loaders/DotsLoader';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { AI_ASSISTANT_NAME_DEFAULT } from '@/lib/brand';
import { ArrowRight, MapPin, X } from 'lucide-react';
import type { NavDestination } from '@/lib/navKnowledgeBase';

interface CommandAIAnswerCardProps {
  response: string;
  isLoading: boolean;
  error: string | null;
  isNavQuestion?: boolean;
  navConfidence?: 'high' | 'medium' | 'low' | 'none';
  destinations?: NavDestination[];
  onNavigate?: (path: string) => void;
  onDismiss?: () => void;
}

function DestinationLink({ dest, query, onNavigate }: { dest: NavDestination; query?: string; onNavigate: (path: string) => void }) {
  // Find matched tab based on query keywords
  const matchedTab = dest.tabs?.find(tab => {
    const q = (query || '').toLowerCase();
    return q.includes(tab.label.toLowerCase()) || tab.purpose.toLowerCase().split(' ').some(w => w.length > 3 && q.includes(w));
  });

  const targetPath = matchedTab ? `${dest.path}?tab=${matchedTab.id}` : dest.path;

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/30 group hover:border-primary/20 hover:bg-muted/50 transition-colors duration-150">
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="w-3.5 h-3.5 text-primary/60 shrink-0" />
        <nav className="flex items-center gap-1 font-sans text-xs text-muted-foreground min-w-0 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigate(dest.path)}
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            {dest.section}
          </button>
          <span className="text-muted-foreground/40">›</span>
          <button
            type="button"
            onClick={() => onNavigate(dest.path)}
            className="text-foreground font-medium hover:text-primary transition-colors cursor-pointer truncate"
          >
            {dest.label}
          </button>
          {matchedTab && (
            <>
              <span className="text-muted-foreground/40">›</span>
              <button
                type="button"
                onClick={() => onNavigate(targetPath)}
                className="text-primary hover:text-primary/80 transition-colors cursor-pointer truncate"
              >
                {matchedTab.label}
              </button>
            </>
          )}
        </nav>
      </div>
      <button
        type="button"
        onClick={() => onNavigate(targetPath)}
        className="shrink-0 inline-flex items-center gap-1 font-sans text-xs font-medium text-primary hover:text-primary/80 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors duration-150 cursor-pointer"
      >
        Open
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

export function CommandAIAnswerCard({ response, isLoading, error, isNavQuestion, navConfidence, destinations = [], onNavigate, onDismiss }: CommandAIAnswerCardProps) {
  
  const hasDestinations = destinations.length > 0 && onNavigate;

  if (!isLoading && !response && !error) return null;

  return (
    <div className="mx-3 mt-2 mb-1 rounded-lg border border-primary/10 bg-gradient-to-br from-card to-card/60 backdrop-blur-sm p-4">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <ZuraZIcon className={cn(
          'w-3.5 h-3.5 text-primary',
          isLoading && 'animate-pulse'
        )} />
        <span className="font-display text-[10px] font-medium text-primary uppercase tracking-wider flex-1">
          {AI_ASSISTANT_NAME_DEFAULT}
        </span>
        {onDismiss && !isLoading && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground/50 hover:text-foreground p-0.5 transition-colors"
            tabIndex={-1}
            aria-label="Dismiss AI answer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
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

      {/* Medium-confidence navigation note */}
      {isNavQuestion && navConfidence === 'medium' && !isLoading && response && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/30">
          <p className="font-sans text-[11px] text-muted-foreground">
            I found the destination, but the exact in-page steps may vary. Use <kbd className="rounded border border-border/50 bg-muted/70 px-1 py-0.5 font-mono text-[10px]">⌘K</kbd> to navigate directly.
          </p>
        </div>
      )}

      {/* Low-confidence navigation warning */}
      {isNavQuestion && navConfidence === 'low' && !isLoading && response && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/40">
          <p className="font-sans text-[11px] text-muted-foreground">
            I couldn't fully verify these steps in the current build. Use <kbd className="rounded border border-border/50 bg-muted/70 px-1 py-0.5 font-mono text-[10px]">⌘K</kbd> to search for the exact page.
          </p>
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
        <div className="prose prose-sm dark:prose-invert max-w-none font-sans transition-opacity duration-200">
          <ReactMarkdown>{response}</ReactMarkdown>
        </div>
      )}

      {/* Navigation Quick Links */}
      {hasDestinations && !isLoading && response && (
        <div className="mt-3 pt-3 border-t border-border/20 space-y-2">
          <span className="font-sans text-[10px] text-muted-foreground/70 uppercase tracking-wider">
            Quick links
          </span>
          {destinations.map((dest) => (
            <DestinationLink key={dest.id} dest={dest} onNavigate={onNavigate!} />
          ))}
        </div>
      )}
    </div>
  );
}
