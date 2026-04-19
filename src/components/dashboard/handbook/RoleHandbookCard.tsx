import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Upload, ArrowRight, CheckCircle2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { formatDistanceToNow } from 'date-fns';

export interface RoleHandbookCardProps {
  roleKey: string;
  roleLabel: string;
  handbook?: any;
  ackCount?: { acknowledged: number; total: number };
  onConfigure: () => void;
  onUpload: () => void;
  onOpen?: () => void;
  loading?: boolean;
}

function statusFromHandbook(handbook?: any): 'not_started' | 'draft' | 'published' {
  if (!handbook) return 'not_started';
  if (handbook.status === 'published') return 'published';
  return 'draft';
}

function StatusChip({ status }: { status: 'not_started' | 'draft' | 'published' }) {
  const map = {
    not_started: { label: 'Not started', cls: 'bg-muted text-muted-foreground' },
    draft: { label: 'Draft', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    published: { label: 'Published', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  } as const;
  const cfg = map[status];
  return (
    <Badge variant="outline" className={cn('font-sans text-[10px] tracking-wide border-transparent', cfg.cls)}>
      {cfg.label}
    </Badge>
  );
}

export function RoleHandbookCard({
  roleKey,
  roleLabel,
  handbook,
  ackCount,
  onConfigure,
  onUpload,
  onOpen,
  loading,
}: RoleHandbookCardProps) {
  const status = statusFromHandbook(handbook);
  const hasHandbook = !!handbook;
  const ackPct =
    ackCount && ackCount.total > 0
      ? Math.round((ackCount.acknowledged / ackCount.total) * 100)
      : null;

  return (
    <Card className="rounded-xl border-border bg-card/80 hover:border-primary/40 transition-colors h-full flex flex-col">
      <CardContent className="p-5 flex flex-col flex-1 gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className={cn(tokens.heading.card, 'truncate')}>{roleLabel}</h3>
            <p className="font-sans text-xs text-muted-foreground mt-1">
              {hasHandbook
                ? `Updated ${formatDistanceToNow(new Date(handbook.updated_at), { addSuffix: true })}`
                : 'No handbook configured'}
            </p>
          </div>
          <StatusChip status={status} />
        </div>

        {/* Ack stat */}
        {hasHandbook && handbook.legacy_handbook_id && ackCount && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50">
            <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-sans text-xs text-foreground">
              {ackCount.acknowledged}/{ackCount.total} acknowledged
              {ackPct !== null && (
                <span className="text-muted-foreground ml-1">· {ackPct}%</span>
              )}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex flex-col gap-2 pt-2">
          {hasHandbook ? (
            <>
              <Button
                onClick={onOpen}
                disabled={loading}
                className="font-sans w-full justify-between"
                size="sm"
              >
                Open handbook
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={onUpload}
                disabled={loading}
                variant="ghost"
                className="font-sans w-full justify-start text-xs"
                size="sm"
              >
                <Upload className="w-3.5 h-3.5 mr-2" />
                Upload supplemental document
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={onConfigure}
                disabled={loading}
                className="font-sans w-full justify-between"
                size="sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <>
                    <span className="flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Configure in wizard
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
              <Button
                onClick={onUpload}
                disabled={loading}
                variant="outline"
                className="font-sans w-full"
                size="sm"
              >
                <FileText className="w-3.5 h-3.5 mr-2" />
                Upload document
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
