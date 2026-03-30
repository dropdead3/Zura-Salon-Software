import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Trash2, Pencil, Percent, DollarSign } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import {
  useServiceDiscounts,
  useToggleServiceDiscount,
  useDeleteServiceDiscount,
  type ServiceDiscount,
} from '@/hooks/useServiceDiscounts';
import { ServiceDiscountFormDialog } from './ServiceDiscountFormDialog';
import { tokens } from '@/lib/design-tokens';

interface ServiceDiscountsManagerProps {
  organizationId?: string;
}

export function ServiceDiscountsManager({ organizationId }: ServiceDiscountsManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<ServiceDiscount | null>(null);
  const { formatCurrency } = useFormatCurrency();

  const { data: discounts, isLoading } = useServiceDiscounts(organizationId);
  const toggleMutation = useToggleServiceDiscount();
  const deleteMutation = useDeleteServiceDiscount();

  const handleEdit = (discount: ServiceDiscount) => {
    setEditingDiscount(discount);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingDiscount(null);
    setIsFormOpen(true);
  };

  if (isLoading) return <DashboardLoader />;

  const appliesLabel = (d: ServiceDiscount) => {
    if (d.applies_to === 'all_services') return 'All Services';
    if (d.applies_to === 'specific_services') return `${d.applicable_service_ids?.length ?? 0} services`;
    if (d.applies_to === 'specific_categories') return `${d.applicable_categories?.length ?? 0} categories`;
    return d.applies_to;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className={tokens.card.title}>Service Discounts</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Reusable discount templates for appointments — Model Rate, Employee Discount, VIP Comp, etc.
            </p>
          </div>
          <Button size="sm" onClick={handleCreate} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Discount
          </Button>
        </CardHeader>
        <CardContent>
          {(!discounts || discounts.length === 0) ? (
            <div className={tokens.empty.container}>
              <Percent className={tokens.empty.icon} />
              <h3 className={tokens.empty.heading}>No discounts configured</h3>
              <p className={tokens.empty.description}>
                Create discount templates to apply to appointments at booking time.
              </p>
              <Button size="sm" onClick={handleCreate} className="mt-3 gap-1.5">
                <Plus className="w-4 h-4" />
                Create First Discount
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={tokens.table.columnHeader}>Name</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Type</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Value</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Applies To</TableHead>
                  <TableHead className={tokens.table.columnHeader}>Active</TableHead>
                  <TableHead className={tokens.table.columnHeader} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {d.discount_type === 'percentage' ? (
                          <><Percent className="w-3 h-3" /> Percentage</>
                        ) : (
                          <><DollarSign className="w-3 h-3" /> Fixed</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {d.discount_type === 'percentage'
                        ? `${d.discount_value}%`
                        : formatCurrency(d.discount_value)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {appliesLabel(d)}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={d.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: d.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(d)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(d.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ServiceDiscountFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        organizationId={organizationId}
        discount={editingDiscount}
      />
    </>
  );
}
