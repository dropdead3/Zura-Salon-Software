import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { SilverShineWrapper } from '@/components/ui/SilverShineWrapper';
import { DollarSign } from 'lucide-react';

interface ChaChingToastProps {
  amount: number;
  toastId: string | number;
}

export function ChaChingToast({ amount, toastId }: ChaChingToastProps) {
  return (
    <SilverShineWrapper variant="card" className="w-[340px]">
      <div
        className="flex items-center gap-4 bg-card/80 backdrop-blur-xl rounded-lg p-4 cursor-pointer"
        onClick={() => toast.dismiss(toastId)}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-success" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-display text-xs tracking-wide uppercase text-foreground">
            Cha-ching!
          </p>
          <p className="font-display text-xl tabular-nums text-foreground mt-0.5">
            {formatCurrency(amount)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            A client just checked out
          </p>
        </div>

      </div>
    </SilverShineWrapper>
  );
}
