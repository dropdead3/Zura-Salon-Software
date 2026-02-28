/**
 * INSIGHTS TAB — Website Intelligence Layer
 * 
 * Displays AI-powered analysis of the salon website across SEO,
 * conversion, content quality, and structure categories.
 */

import { useState } from 'react';
import { Sparkles, RefreshCw, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { AnalysisResult, CategoryScore, Finding } from '@/hooks/useWebsiteAnalysis';

interface StructureInsightsTabProps {
  data: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  onAnalyze: () => void;
  onFindingClick?: (actionTarget: string) => void;
}

// ─── Score Ring ───

function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? 'hsl(var(--success, 142 76% 36%))' : score >= 50 ? 'hsl(var(--warning, 38 92% 50%))' : 'hsl(var(--destructive))';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-medium tracking-wide">{score}</span>
        <span className="font-sans text-[10px] text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

// ─── Severity Icons ───

function SeverityIcon({ severity }: { severity: Finding['severity'] }) {
  switch (severity) {
    case 'pass':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />;
    case 'error':
      return <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />;
    case 'warn':
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />;
    case 'info':
      return <Info className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />;
  }
}

// ─── Category Section ───

function CategorySection({
  category,
  onFindingClick,
}: {
  category: CategoryScore;
  onFindingClick?: (target: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const issueCount = category.findings.filter(f => f.severity !== 'pass').length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between py-2 px-3 hover:bg-muted/40 rounded-lg transition-colors duration-150">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="font-display text-xs tracking-wide uppercase">{category.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-muted-foreground">
            {category.score}/{category.maxScore}
          </span>
          {issueCount > 0 && (
            <span className="font-sans text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
              {issueCount}
            </span>
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-4 pr-2 pb-2 space-y-1">
          {category.findings.map((finding) => (
            <button
              key={finding.id}
              onClick={() => finding.actionTarget && onFindingClick?.(finding.actionTarget)}
              disabled={!finding.actionTarget || finding.severity === 'pass'}
              className={cn(
                'w-full flex items-start gap-2 py-1.5 px-2 rounded-md text-left transition-colors duration-150',
                finding.actionTarget && finding.severity !== 'pass'
                  ? 'hover:bg-muted/60 cursor-pointer'
                  : 'cursor-default'
              )}
            >
              <SeverityIcon severity={finding.severity} />
              <span className={cn(
                'font-sans text-xs leading-relaxed',
                finding.severity === 'pass' ? 'text-muted-foreground' : 'text-foreground'
              )}>
                {finding.message}
              </span>
            </button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Main Component ───

export function StructureInsightsTab({
  data,
  isLoading,
  error,
  onAnalyze,
  onFindingClick,
}: StructureInsightsTabProps) {
  // ─── Empty State ───
  if (!data && !isLoading && !error) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-display text-sm tracking-wide uppercase mb-2">Website Intelligence</h3>
        <p className={cn(tokens.body.muted, 'mb-6 max-w-[200px]')}>
          Analyze your website for SEO, conversion, content quality, and structure improvements.
        </p>
        <Button
          onClick={onAnalyze}
          className="font-sans font-medium"
          size="sm"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Run Analysis
        </Button>
      </div>
    );
  }

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 py-12 text-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className={tokens.body.muted}>Analyzing your website...</p>
      </div>
    );
  }

  // ─── Error ───
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 py-12 text-center gap-3">
        <XCircle className="h-8 w-8 text-destructive" />
        <p className="font-sans text-sm text-destructive">{error}</p>
        <Button onClick={onAnalyze} variant="outline" size="sm" className="font-sans">
          Try Again
        </Button>
      </div>
    );
  }

  if (!data) return null;

  // ─── Results ───
  return (
    <ScrollArea className="h-full">
      <div className="px-3 py-4 space-y-4">
        {/* Score Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ScoreRing score={data.score} size={72} />
            <div>
              <p className="font-display text-xs tracking-wide uppercase text-muted-foreground">
                Conversion Score
              </p>
              <p className={cn(
                'font-sans text-xs mt-0.5',
                data.score >= 75 ? 'text-emerald-600' : data.score >= 50 ? 'text-amber-600' : 'text-destructive'
              )}>
                {data.score >= 75 ? 'Strong' : data.score >= 50 ? 'Needs work' : 'Critical issues'}
              </p>
            </div>
          </div>
          <Button
            onClick={onAnalyze}
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="font-sans h-8 w-8 p-0"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Category Sections */}
        <div className="border-t border-border/40 pt-3 space-y-1">
          {data.categories.map((cat) => (
            <CategorySection
              key={cat.category}
              category={cat}
              onFindingClick={onFindingClick}
            />
          ))}
        </div>

        {/* AI Suggestions */}
        {data.aiSuggestions.length > 0 && (
          <div className="border-t border-border/40 pt-3">
            <div className="flex items-center gap-2 px-3 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-display text-xs tracking-wide uppercase">
                AI Suggestions
              </span>
            </div>
            <div className="space-y-2 px-3">
              {data.aiSuggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 py-2 px-3 rounded-lg bg-primary/5 border border-primary/10"
                >
                  <span className="font-sans text-[10px] font-medium text-primary mt-0.5 flex-shrink-0">
                    {i + 1}.
                  </span>
                  <p className="font-sans text-xs text-foreground leading-relaxed">
                    {suggestion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        {data.analyzedAt && (
          <p className="text-center font-sans text-[10px] text-muted-foreground pt-2">
            Analyzed {new Date(data.analyzedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
