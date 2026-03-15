import { Shield, Lock, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useBillingAccess } from '@/hooks/useBillingAccess';

/** Info banner showing who has access to billing */
export function BillingAccessBanner() {
  const { isPrimaryOwner, isSuperAdmin, isBillingOwnerOnly } = useBillingAccess();

  if (isPrimaryOwner) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground">
        <Shield className="w-4 h-4 text-primary shrink-0" />
        <span>
          Only the <span className="font-medium text-foreground">Account Owner</span>
          {!isBillingOwnerOnly && (
            <> and <span className="font-medium text-foreground">Super Admins</span></>
          )}{' '}
          can view and manage billing.
        </span>
      </div>
    );
  }

  if (isSuperAdmin) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border text-sm text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0" />
        <span>
          You have access to billing as a <span className="font-medium text-foreground">Super Admin</span>.
          The Account Owner can restrict this at any time.
        </span>
      </div>
    );
  }

  return null;
}

/** Toggle card for the Account Owner to restrict Super Admin billing access */
export function BillingOwnerToggleCard() {
  const { isPrimaryOwner, isBillingOwnerOnly, toggleBillingOwnerOnly, isToggling } = useBillingAccess();

  if (!isPrimaryOwner) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          <CardTitle className="font-display text-base tracking-wide">BILLING ACCESS CONTROL</CardTitle>
        </div>
        <CardDescription>
          Control who can view and manage your subscription, payment methods, and invoice history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sans font-medium text-sm">Restrict billing to Account Owner only</p>
            <p className="text-xs text-muted-foreground">
              When enabled, Super Admins will no longer be able to view or modify plans, payment methods, or billing history.
            </p>
          </div>
          <Switch
            checked={isBillingOwnerOnly}
            onCheckedChange={toggleBillingOwnerOnly}
            disabled={isToggling}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** Full-page access denied state */
export function BillingAccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Lock className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="font-display text-xl tracking-wide">ACCESS RESTRICTED</h2>
      <p className="text-muted-foreground text-sm max-w-md">
        Account & Billing settings are only available to the Account Owner and Super Admins.
        Contact your Account Owner for access.
      </p>
    </div>
  );
}
