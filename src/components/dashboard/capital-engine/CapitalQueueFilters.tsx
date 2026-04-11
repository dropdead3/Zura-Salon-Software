import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OPPORTUNITY_TYPES, OPPORTUNITY_TYPE_LABELS } from '@/config/capital-engine/zura-capital-config';
import type { OpportunityType } from '@/config/capital-engine/zura-capital-config';

export interface CapitalFilters {
  type: string;
  status: string;
  risk: string;
}

interface Props {
  filters: CapitalFilters;
  onChange: (filters: CapitalFilters) => void;
}

export function CapitalQueueFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.type} onValueChange={v => onChange({ ...filters, type: v })}>
        <SelectTrigger className="h-8 w-[160px] text-xs font-sans">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {OPPORTUNITY_TYPES.map(t => (
            <SelectItem key={t} value={t}>{OPPORTUNITY_TYPE_LABELS[t]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={v => onChange({ ...filters, status: v })}>
        <SelectTrigger className="h-8 w-[140px] text-xs font-sans">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="eligible_provider">Funding Available</SelectItem>
          <SelectItem value="surfaced">Surfaced</SelectItem>
          <SelectItem value="viewed">Reviewed</SelectItem>
          <SelectItem value="initiated">Initiated</SelectItem>
          <SelectItem value="funded">Funded</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.risk} onValueChange={v => onChange({ ...filters, risk: v })}>
        <SelectTrigger className="h-8 w-[120px] text-xs font-sans">
          <SelectValue placeholder="All Risk" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Risk</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
