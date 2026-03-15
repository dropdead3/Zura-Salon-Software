import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';

/** Features per plan tier — used to compute what users lose on downgrade */
const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    'Product catalog & inventory',
    'Recipe management',
    'Cost tracking',
    'Waste monitoring',
  ],
  professional: [
    'Supply AI insights',
    'Ghost loss detection',
    'Cost spike alerts',
    'Weekly intelligence digest',
  ],
  unlimited: [
    'Predictive demand forecasting',
    'Multi-location benchmarking',
    'Priority support',
    'Advanced analytics',
  ],
};

const TIER_ORDER = ['starter', 'professional', 'unlimited'];

function getLostFeatures(currentPlan: string, targetPlan: string): string[] {
  const currentIdx = TIER_ORDER.indexOf(currentPlan);
  const targetIdx = TIER_ORDER.indexOf(targetPlan);
  if (targetIdx >= currentIdx) return [];

  const lost: string[] = [];
  for (let i = targetIdx + 1; i <= currentIdx; i++) {
    lost.push(...(PLAN_FEATURES[TIER_ORDER[i]] || []));
  }
  return lost;
}

const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  unlimited: 'Unlimited',
};

interface DowngradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  targetPlan: string;
  onConfirm: () => void;
}

export function DowngradeConfirmDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  onConfirm,
}: DowngradeConfirmDialogProps) {
  const lostFeatures = getLostFeatures(currentPlan, targetPlan);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle className={cn(tokens.heading.section, 'text-base')}>
                Confirm Downgrade
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-sans mt-0.5">
                {PLAN_NAMES[currentPlan]} → {PLAN_NAMES[targetPlan]}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {lostFeatures.length > 0 && (
          <div className="space-y-2 py-2">
            <p className="text-sm font-sans text-muted-foreground">
              You'll lose access to these features:
            </p>
            <ul className="space-y-1.5">
              {lostFeatures.map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-sm font-sans text-destructive">
                  <X className="w-3.5 h-3.5 shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="font-sans font-medium">
            Keep Current Plan
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-sans font-medium"
          >
            Proceed to Downgrade
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
