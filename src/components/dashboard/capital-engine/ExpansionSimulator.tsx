import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tokens } from '@/lib/design-tokens';
import { formatCurrency } from '@/lib/format';
import { simulateScenario, type ScenarioResult } from '@/lib/capital-engine/capital-engine';
import { Calculator, ArrowRight } from 'lucide-react';
import type { QueuedOpportunity } from '@/lib/capital-engine/capital-engine';

interface Props {
  opportunities: QueuedOpportunity[];
}

export function ExpansionSimulator({ opportunities }: Props) {
  const [selectedOppId, setSelectedOppId] = useState<string>('');
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('medium');
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const selectedOpp = opportunities.find(o => o.id === selectedOppId);

  const handleSimulate = () => {
    if (!selectedOpp || !investmentAmount) return;
    const sim = simulateScenario({
      investmentAmount: Number(investmentAmount),
      baseAnnualLift: selectedOpp.predictedAnnualLift,
      baseCapitalRequired: selectedOpp.capitalRequired,
      confidence,
    });
    setResult(sim);
  };

  return (
    <Card className={tokens.card.wrapper}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={tokens.card.iconBox}>
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className={tokens.card.title}>Investment Simulator</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {opportunities.length === 0 ? (
          <p className="text-sm text-muted-foreground font-sans">
            Create expansion opportunities to simulate investments.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-sans text-xs">Opportunity</Label>
                <Select value={selectedOppId} onValueChange={setSelectedOppId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select opportunity" />
                  </SelectTrigger>
                  <SelectContent>
                    {opportunities.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-sans text-xs">Investment Amount ($)</Label>
                <Input
                  type="number"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-sans text-xs">Confidence</Label>
                <Select value={confidence} onValueChange={(v) => setConfidence(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleSimulate}
              disabled={!selectedOppId || !investmentAmount}
              className="font-sans"
              size="sm"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Simulate
            </Button>

            {result && (
              <div className="rounded-lg bg-muted/40 border border-border/40 p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground font-sans block">Monthly Lift</span>
                    <span className="font-display text-lg tracking-wide">
                      {formatCurrency(result.projectedMonthlyLift, { noCents: true })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-sans block">Annual Lift</span>
                    <span className="font-display text-lg tracking-wide">
                      {formatCurrency(result.projectedAnnualLift, { noCents: true })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-sans block">Break-Even</span>
                    <span className="font-display text-lg tracking-wide">
                      {result.breakEvenMonths}mo
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-sans block">Range</span>
                    <span className="font-sans text-sm">
                      {formatCurrency(result.lowBand, { noCents: true })}
                      <ArrowRight className="w-3 h-3 inline mx-1" />
                      {formatCurrency(result.highBand, { noCents: true })}
                      <span className="text-xs text-muted-foreground"> /mo</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
