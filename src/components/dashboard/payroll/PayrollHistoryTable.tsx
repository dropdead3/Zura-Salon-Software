import { useState } from 'react';
import { useFormatDate } from '@/hooks/useFormatDate';
import { 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  FileText,
  Users
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePayroll, PayrollRun } from '@/hooks/usePayroll';
import { AnimatePresence, motion } from 'framer-motion';

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  draft: {
    label: 'Draft',
    icon: FileText,
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  submitted: {
    label: 'Submitted',
    icon: Clock,
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800',
  },
  processed: {
    label: 'Processed',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800',
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

interface PayrollRowProps {
  run: PayrollRun;
  isExpanded: boolean;
  onToggle: () => void;
}

function PayrollRow({ run, isExpanded, onToggle }: PayrollRowProps) {
  const { formatDate } = useFormatDate();
  const status = statusConfig[run.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell>
          <Button variant="ghost" size={tokens.button.inline} className="h-6 w-6 p-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell>
          <div className="font-medium">
            {formatDate(new Date(run.pay_period_start), 'MMM d')} -{' '}
            {formatDate(new Date(run.pay_period_end), 'MMM d, yyyy')}
          </div>
        </TableCell>
        <TableCell>
          {formatDate(new Date(run.check_date), 'MMM d, yyyy')}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{run.employee_count}</span>
          </div>
        </TableCell>
        <TableCell className="font-medium">
          {formatCurrency(run.total_gross_pay)}
        </TableCell>
        <TableCell className="font-medium text-success-foreground">
          {formatCurrency(run.total_net_pay)}
        </TableCell>
        <TableCell>
          <Badge className={cn('border', status.className)}>
            <StatusIcon className={cn('h-3 w-3 mr-1', status.icon === Loader2 && 'animate-spin')} />
            {status.label}
          </Badge>
        </TableCell>
      </TableRow>
      
      <AnimatePresence initial={false}>
        {isExpanded && (
          <TableRow>
            <TableCell colSpan={7} className="p-0 bg-muted/30">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground">Gross Pay</p>
                      <p className="font-medium text-lg">{formatCurrency(run.total_gross_pay)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Employer Taxes</p>
                      <p className="font-medium text-lg text-warning-foreground">
                        {formatCurrency(run.total_employer_taxes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Employee Deductions</p>
                      <p className="font-medium text-lg text-destructive">
                        {formatCurrency(run.total_employee_deductions)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net Pay</p>
                      <p className="font-medium text-lg text-success-foreground">
                        {formatCurrency(run.total_net_pay)}
                      </p>
                    </div>
                  </div>
                  
                  {run.submitted_at && (
                    <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                      Submitted on {formatDate(new Date(run.submitted_at), 'MMMM d, yyyy at h:mm a')}
                      {run.processed_at && (
                        <span>
                          {' • ')}Processed on {formatDate(new Date(run.processed_at), 'MMMM d, yyyy at h:mm a')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  );
}

export function PayrollHistoryTable() {
  const { payrollRuns, isLoadingRuns } = usePayroll();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoadingRuns) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (payrollRuns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">No payroll runs yet</p>
        <p className="text-sm">Run your first payroll to see history here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Pay Period</TableHead>
            <TableHead>Check Date</TableHead>
            <TableHead>Employees</TableHead>
            <TableHead>Gross Pay</TableHead>
            <TableHead>Net Pay</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payrollRuns.map((run) => (
            <PayrollRow
              key={run.id}
              run={run}
              isExpanded={expandedId === run.id}
              onToggle={() => setExpandedId(expandedId === run.id ? null : run.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
