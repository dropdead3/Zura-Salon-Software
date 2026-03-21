import { type LeverRecommendation } from '@/hooks/useLeverRecommendations';

interface LeverDetailPanelProps {
  recommendation: LeverRecommendation;
}

export function LeverDetailPanel({ recommendation }: LeverDetailPanelProps) {
  const evidence = recommendation.evidence || {};
  const hasEvidence = Object.keys(evidence).length > 0;

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-[hsl(var(--platform-border))] bg-[hsl(var(--platform-card))]/50 p-4">
      {/* Summary */}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]">
          Analysis Summary
        </p>
        <p className="text-sm text-[hsl(var(--platform-foreground))]">
          {recommendation.summary}
        </p>
      </div>

      {/* Evidence sections */}
      {hasEvidence && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]">
            Supporting Evidence
          </p>
          {Object.entries(evidence).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <p className="text-xs font-medium capitalize text-[hsl(var(--platform-foreground))]">
                {key.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-[hsl(var(--platform-foreground-muted))]">
                {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Period */}
      <div className="flex items-center gap-4 text-xs text-[hsl(var(--platform-foreground-muted))]">
        <span>Period: {recommendation.period_start} → {recommendation.period_end}</span>
        <span>Generated: {new Date(recommendation.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
