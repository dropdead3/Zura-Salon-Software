import { useRenterInsurance, useUpdateRenterInsurance, useVerifyRenterInsurance } from '@/hooks/useRenterInsurance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { differenceInDays } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Edit2, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface InsuranceCardProps {
  boothRenterId: string;
  canVerify?: boolean;
}

interface FormData {
  insurance_provider: string;
  insurance_policy_number: string;
  insurance_expiry_date: string;
}

export function InsuranceCard({ boothRenterId, canVerify = false }: InsuranceCardProps) {
  const { formatDate } = useFormatDate();
  const { data: insurance, isLoading } = useRenterInsurance(boothRenterId);
  const updateInsurance = useUpdateRenterInsurance();
  const verifyInsurance = useVerifyRenterInsurance();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { register, handleSubmit, reset } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    await updateInsurance.mutateAsync({
      boothRenterId,
      insurance_provider: data.insurance_provider,
      insurance_policy_number: data.insurance_policy_number,
      insurance_expiry_date: data.insurance_expiry_date,
    });
    setIsEditOpen(false);
  };

  const handleVerify = async () => {
    await verifyInsurance.mutateAsync(boothRenterId);
  };

  const handleEditOpen = () => {
    if (insurance) {
      reset({
        insurance_provider: insurance.insurance_provider || '',
        insurance_policy_number: insurance.insurance_policy_number || '',
        insurance_expiry_date: insurance.insurance_expiry_date || '',
      });
    }
    setIsEditOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (insurance?.expiry_status) {
      case 'valid':
        return <ShieldCheck className="h-5 w-5 text-green-500" />;
      case 'expiring_soon':
        return <ShieldAlert className="h-5 w-5 text-amber-500" />;
      case 'expired':
        return <ShieldX className="h-5 w-5 text-red-500" />;
      default:
        return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (insurance?.expiry_status) {
      case 'valid':
        return <Badge variant="default" className="bg-green-500">Valid</Badge>;
      case 'expiring_soon':
        return <Badge variant="default" className="bg-amber-500">Expiring Soon</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">Not Set</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getStatusIcon()}
            Liability Insurance
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insurance?.insurance_provider ? (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium">{insurance.insurance_provider}</p>
              <p className="text-xs text-muted-foreground">
                Policy: {insurance.insurance_policy_number || 'Not provided'}
              </p>
            </div>

            {insurance.insurance_expiry_date && (
              <div className="text-sm">
                <span className="text-muted-foreground">Expires: </span>
                <span className={cn(
                  "font-medium",
                  insurance.expiry_status === 'expired' && "text-red-500",
                  insurance.expiry_status === 'expiring_soon' && "text-amber-500"
                )}>
                  {formatDate(new Date(insurance.insurance_expiry_date), 'PPP')}
                </span>
                {insurance.days_until_expiry !== undefined && insurance.days_until_expiry >= 0 && (
                  <span className="text-muted-foreground ml-1">
                    ({insurance.days_until_expiry} days)
                  </span>
                )}
              </div>
            )}

            {insurance.insurance_verified && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Check className="h-3 w-3" />
                Verified
                {insurance.insurance_verified_at && (
                  <span className="text-muted-foreground">
                    on {formatDate(new Date(insurance.insurance_verified_at), 'PP')}
                  </span>
                )}
              </div>
            )}

            {insurance.insurance_document_url && (
              <Button variant="link" size={tokens.button.inline} className="h-auto p-0" asChild>
                <a href={insurance.insurance_document_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Document
                </a>
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No insurance information on file
          </p>
        )}

        <div className="flex gap-2 pt-2">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button size={tokens.button.card} variant="outline" onClick={handleEditOpen}>
                <Edit2 className="h-3 w-3 mr-1" />
                {insurance?.insurance_provider ? 'Update' : 'Add Insurance'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Insurance Information</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Insurance Provider</Label>
                  <Input {...register('insurance_provider')} placeholder="e.g., State Farm, GEICO" />
                </div>
                <div className="space-y-2">
                  <Label>Policy Number</Label>
                  <Input {...register('insurance_policy_number')} placeholder="Policy number" />
                </div>
                <div className="space-y-2">
                  <Label>Expiration Date</Label>
                  <Input type="date" {...register('insurance_expiry_date')} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateInsurance.isPending}>
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {canVerify && insurance?.insurance_provider && !insurance.insurance_verified && (
            <Button 
              size={tokens.button.card} 
              onClick={handleVerify}
              disabled={verifyInsurance.isPending}
            >
              <Check className="h-3 w-3 mr-1" />
              Verify
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
