import { Badge } from '@/components/ui/badge';
import {
  FUNDING_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  REPAYMENT_STATUS_LABELS,
  ACTIVATION_STATUS_LABELS,
} from '@/config/capital-engine/zura-capital-config';

type BadgeType = 'opportunity' | 'project' | 'repayment' | 'activation';

const LABEL_MAPS: Record<BadgeType, Record<string, { label: string; color: string }>> = {
  opportunity: FUNDING_STATUS_LABELS,
  project: PROJECT_STATUS_LABELS,
  repayment: REPAYMENT_STATUS_LABELS,
  activation: ACTIVATION_STATUS_LABELS,
};

interface Props {
  status: string;
  type?: BadgeType;
  className?: string;
}

export function CapitalStatusBadge({ status, type = 'opportunity', className }: Props) {
  const info = LABEL_MAPS[type][status] ?? { label: status, color: 'text-muted-foreground' };
  return (
    <Badge variant="outline" className={`text-[10px] font-sans ${info.color} ${className ?? ''}`}>
      {info.label}
    </Badge>
  );
}
