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
import { Plus, MoreHorizontal, Pencil, Trash2, Copy } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { isPast, isFuture } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { usePromotions, useUpdatePromotion, useDeletePromotion, type Promotion } from '@/hooks/usePromotions';
import { PromotionFormDialog } from './PromotionFormDialog';
import { toast } from 'sonner';

interface PromotionsListProps {
  organizationId?: string;
}

const PROMOTION_TYPE_LABELS: Record<string, string> = {
  percentage_discount: '% Off',
  fixed_discount: '$ Off',
  bogo: 'BOGO',
  bundle: 'Bundle',
  new_client: 'New Client',
  loyalty_bonus: 'Loyalty',
  referral: 'Referral',
};

export function PromotionsList({ organizationId }: PromotionsListProps) {
  const { formatDate } = useFormatDate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const { formatCurrency } = useFormatCurrency();
  
  const { data: promotions, isLoading } = usePromotions(organizationId);
  const updatePromotion = useUpdatePromotion();
  const deletePromotion = useDeletePromotion();

  const getStatus = (promo: Promotion) => {
    if (!promo.is_active) return { label: 'Inactive', variant: 'secondary' as const };
    if (promo.expires_at && isPast(new Date(promo.expires_at))) return { label: 'Expired', variant: 'destructive' as const };
    if (isFuture(new Date(promo.starts_at))) return { label: 'Scheduled', variant: 'outline' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  const handleToggleActive = async (promo: Promotion) => {
    await updatePromotion.mutateAsync({
      id: promo.id,
      is_active: !promo.is_active,
    });
  };

  const handleDelete = async (promo: Promotion) => {
    if (!organizationId) return;
    if (!confirm(`Delete promotion "${promo.name}"?`)) return;
    await deletePromotion.mutateAsync({ id: promo.id, organizationId });
  };

  const handleDuplicate = (promo: Promotion) => {
    setEditingPromotion({
      ...promo,
      id: '', // Will create new
      name: `${promo.name} (Copy)`,
      promo_code: promo.promo_code ? `${promo.promo_code}-COPY` : null,
    });
    setIsFormOpen(true);
  };

  const handleEdit = (promo: Promotion) => {
    setEditingPromotion(promo);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingPromotion(null);
  };

  if (!organizationId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select an organization to manage promotions
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Promotions</CardTitle>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Promotion
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <DashboardLoader size="md" className="py-8" />
          ) : !promotions?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No promotions yet</p>
              <p className="text-sm mt-1">Create your first promotion to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => {
                  const status = getStatus(promo);
                  return (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{promo.name}</p>
                          {promo.expires_at && (
                            <p className="text-xs text-muted-foreground">
                              Expires {formatDate(new Date(promo.expires_at), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {PROMOTION_TYPE_LABELS[promo.promotion_type] || promo.promotion_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {promo.promotion_type === 'percentage_discount' 
                          ? `${promo.discount_value}%`
                          : promo.promotion_type === 'fixed_discount'
                          ? formatCurrency(promo.discount_value)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {promo.promo_code ? (
                          <code className="px-2 py-1 bg-muted rounded text-xs">
                            {promo.promo_code}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {promo.current_usage_count}
                        {promo.usage_limit && ` / ${promo.usage_limit}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={promo.is_active}
                          onCheckedChange={() => handleToggleActive(promo)}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(promo)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(promo)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(promo)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PromotionFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        organizationId={organizationId}
        promotion={editingPromotion}
      />
    </>
  );
}
