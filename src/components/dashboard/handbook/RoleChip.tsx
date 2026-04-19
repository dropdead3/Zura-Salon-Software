import { Badge } from '@/components/ui/badge';
import { ROLE_OPTIONS } from '@/lib/handbook/brandTones';

export function RoleChip({ roleKey }: { roleKey: string }) {
  const role = ROLE_OPTIONS.find((r) => r.key === roleKey);
  return (
    <Badge variant="outline" className="font-sans text-xs border-border bg-muted/40 text-foreground">
      {role?.label || roleKey}
    </Badge>
  );
}
