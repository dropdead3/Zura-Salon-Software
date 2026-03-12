/**
 * SmartMixAssistCard — Displays a suggested starting formula when a bowl begins.
 *
 * Shows source label, line items with target weights, computed ratio,
 * inline disclaimer, and two actions: Use / Dismiss.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Beaker, X } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { FormulaSuggestion } from '@/lib/backroom/services/smart-mix-assist-service';

interface SmartMixAssistCardProps {
  suggestion: FormulaSuggestion;
  onApply: () => void;
  onDismiss: () => void;
  isApplying?: boolean;
}

export function SmartMixAssistCard({
  suggestion,
  onApply,
  onDismiss,
  isApplying = false,
}: SmartMixAssistCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className={cn(tokens.label.default, 'text-foreground')}>
                Suggested Starting Formula
              </p>
              <p className={tokens.label.tiny}>{suggestion.sourceLabel}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          {suggestion.lines.map((line, idx) => (
            <div
              key={`${line.product_id ?? idx}`}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-background/60 border border-border/40"
            >
              <div className="flex items-center gap-2">
                <Beaker className="w-3.5 h-3.5 text-muted-foreground" />
                <span className={tokens.body.default}>
                  {line.product_name}
                </span>
              </div>
              <span className={cn(tokens.body.emphasis, 'tabular-nums')}>
                {line.quantity} {line.unit}
              </span>
            </div>
          ))}
        </div>

        {/* Ratio */}
        {suggestion.ratio && (
          <div className="flex items-center gap-2 px-3">
            <span className={tokens.label.tiny}>Ratio</span>
            <span className={cn(tokens.body.emphasis, 'text-xs tabular-nums')}>
              {suggestion.ratio}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={onApply}
            disabled={isApplying}
            size="sm"
            className="flex-1"
          >
            {isApplying ? 'Applying…' : 'Use Suggested Formula'}
          </Button>
          <Button
            variant="outline"
            onClick={onDismiss}
            size="sm"
            className="flex-1"
          >
            Start Empty Bowl
          </Button>
        </div>

        {/* Inline Disclaimer */}
        <p className="text-[10px] text-muted-foreground/70 leading-tight px-1">
          Suggested formula based on history and service recipes. Always review
          and adjust as needed. Final formulation decisions are the responsibility
          of the licensed stylist.
        </p>
      </CardContent>
    </Card>
  );
}
