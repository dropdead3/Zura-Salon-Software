import { Badge } from '@/components/ui/badge';
import { EMPLOYMENT_TYPES } from '@/lib/handbook/brandTones';

export function EmploymentTypeChip({ typeKey }: { typeKey: string }) {
  const t = EMPLOYMENT_TYPES.find((x) => x.key === typeKey);
  return (
    <Badge variant="outline" className="font-sans text-xs border-primary/30 bg-primary/5 text-primary">
      {t?.label || typeKey}
    </Badge>
  );
}
