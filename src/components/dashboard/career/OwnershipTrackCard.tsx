import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { tokens } from '@/lib/design-tokens';
import { getCareerStage, CAREER_STAGES_ORDERED, SPI_TIERS, getSPITierKey } from '@/config/capital-engine/stylist-financing-config';
import { Crown } from 'lucide-react';

interface Props {
  spiScore: number | null;
  orsScore: number | null;
  careerStage: string;
  financingEligible: boolean;
  ownershipEligible: boolean;
}

export function OwnershipTrackCard({
  spiScore,
  orsScore,
  careerStage,
  financingEligible,
  ownershipEligible,
}: Props) {
  const stage = getCareerStage(careerStage);
  const currentIdx = CAREER_STAGES_ORDERED.indexOf(careerStage as any);
  const nextStageKey = currentIdx < CAREER_STAGES_ORDERED.length - 1
    ? CAREER_STAGES_ORDERED[currentIdx + 1]
    : null;
  const nextStage = nextStageKey ? getCareerStage(nextStageKey) : null;

  const spi = spiScore ?? 0;
  const tierKey = getSPITierKey(spi);
  const tier = SPI_TIERS[tierKey];

  const progressPct = Math.min(100, Math.round(((currentIdx + 1) / CAREER_STAGES_ORDERED.length) * 100));

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className={tokens.card.title}>Ownership Track</CardTitle>
            <CardDescription className="font-sans text-sm">
              Your path to operator and ownership status
            </CardDescription>
          </div>
        </div>
        {ownershipEligible && (
          <Badge variant="default" className="text-xs">Ownership Eligible</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Stage */}
        <div className="flex items-center gap-4">
          <div>
            <span className="font-display text-lg tracking-wide">{stage.label}</span>
            <span className="text-xs text-muted-foreground font-sans block">{stage.description}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-sans">
            <span className="text-muted-foreground">Career Progress</span>
            <span>Stage {stage.order} of {CAREER_STAGES_ORDERED.length}</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        {/* SPI & ORS */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="font-display text-2xl tracking-wide">{spi}</span>
            <span className="text-xs text-muted-foreground font-sans block">SPI</span>
            <span className={`text-xs font-sans ${tier.color}`}>{tier.label}</span>
          </div>
          {orsScore !== null && (
            <div className="text-center">
              <span className="font-display text-2xl tracking-wide">{orsScore}</span>
              <span className="text-xs text-muted-foreground font-sans block">ORS</span>
            </div>
          )}
          {financingEligible && (
            <Badge variant="outline" className="text-xs text-primary">
              Financing Unlocked
            </Badge>
          )}
        </div>

        {/* Next Unlock */}
        {nextStage && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
            <span className="text-xs text-muted-foreground font-sans">Next Unlock</span>
            <p className="font-sans text-sm">
              {nextStage.label}
              {nextStage.spiMin > 0 && (
                <span className="text-muted-foreground"> — SPI ≥ {nextStage.spiMin}</span>
              )}
              {nextStage.orsMin && (
                <span className="text-muted-foreground"> · ORS ≥ {nextStage.orsMin}</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
