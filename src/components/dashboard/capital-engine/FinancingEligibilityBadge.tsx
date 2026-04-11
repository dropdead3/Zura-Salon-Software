import { Badge } from '@/components/ui/badge';
import { Banknote } from 'lucide-react';
import { isFinancingEligible, type FinancingCandidate } from '@/lib/capital-engine/financing-engine';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  candidate: FinancingCandidate;
}

export function FinancingEligibilityBadge({ candidate }: Props) {
  const result = isFinancingEligible(candidate);

  if (!result.eligible) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="default" className="text-xs gap-1 shrink-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            <Banknote className="w-3 h-3" />
            Eligible
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-sans text-xs">Qualifies for expansion financing</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
