import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { GitMerge, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface MergedProfileBannerProps {
  mergedIntoName: string;
  mergedAt: string;
  mergedBy?: string;
  primaryClientId: string;
}

export function MergedProfileBanner({ mergedIntoName, mergedAt, mergedBy, primaryClientId }: MergedProfileBannerProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
      <GitMerge className="w-5 h-5 text-amber-600 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          This profile was merged into{' '}
          <span className="font-medium">{mergedIntoName}</span>
          {' '}on {format(new Date(mergedAt), 'MMM d, yyyy')}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          Records have been consolidated into the primary profile.
        </p>
      </div>
      <Badge variant="outline" className="gap-1 text-xs shrink-0">
        <ExternalLink className="w-3 h-3" />
        View Primary
      </Badge>
    </div>
  );
}
