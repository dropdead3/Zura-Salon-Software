import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Globe, Copy, Check, Loader2, Trash2, RefreshCw, AlertCircle, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationDomain, useSaveDomain, useRemoveDomain, useVerifyDomain } from '@/hooks/useOrganizationDomain';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DomainConfigCardProps {
  organizationId: string | undefined;
}

const PLATFORM_IP = '185.158.133.1';

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

const statusConfig: Record<string, { label: string; color: string; className: string }> = {
  pending: { label: 'Pending Verification', color: 'text-yellow-700', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  verifying: { label: 'Verifying...', color: 'text-blue-700', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  active: { label: 'Active', color: 'text-green-700', className: 'bg-green-100 text-green-800 border-green-200' },
  failed: { label: 'Verification Failed', color: 'text-destructive', className: 'bg-red-100 text-red-800 border-red-200' },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Copied', description: 'Value copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

export function DomainConfigCard({ organizationId }: DomainConfigCardProps) {
  const { data: domain, isLoading } = useOrganizationDomain(organizationId);
  const saveDomain = useSaveDomain();
  const removeDomain = useRemoveDomain();
  const verifyDomain = useVerifyDomain();
  const { toast } = useToast();
  const [domainInput, setDomainInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [validationError, setValidationError] = useState('');

  const cleanDomain = (raw: string) =>
    raw.replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/^www\./, '').toLowerCase().trim();

  const validateDomain = (value: string): boolean => {
    const cleaned = cleanDomain(value);
    if (!cleaned) {
      setValidationError('Please enter a domain name.');
      return false;
    }
    if (!DOMAIN_REGEX.test(cleaned)) {
      setValidationError('Enter a valid domain (e.g. mydayspa.com). No http://, spaces, or special characters.');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSave = () => {
    if (!organizationId || !domainInput.trim()) return;
    if (!validateDomain(domainInput)) return;

    saveDomain.mutate(
      { organizationId, domain: domainInput },
      {
        onSuccess: () => {
          toast({ title: 'Domain saved', description: 'Add the DNS records below, then verify.' });
          setDomainInput('');
          setIsEditing(false);
        },
        onError: (err) => toast({ variant: 'destructive', title: 'Error', description: err.message }),
      }
    );
  };

  const handleEdit = () => {
    if (domain) {
      setDomainInput(domain.domain);
      setIsEditing(true);
      setValidationError('');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDomainInput('');
    setValidationError('');
  };

  const handleVerify = () => {
    if (!organizationId) return;
    verifyDomain.mutate(
      { organizationId },
      {
        onSuccess: (data) => {
          toast({
            title: data.status === 'active' ? '✅ Domain Verified' : 'Not verified yet',
            description: data.message,
            variant: data.status === 'active' ? 'default' : 'destructive',
          });
        },
        onError: (err) => toast({ variant: 'destructive', title: 'Verification error', description: err.message }),
      }
    );
  };

  const handleRemove = () => {
    if (!organizationId) return;
    removeDomain.mutate(
      { organizationId },
      {
        onSuccess: () => {
          toast({ title: 'Domain removed', description: 'Custom domain configuration has been cleared.' });
          setIsEditing(false);
        },
        onError: (err) => toast({ variant: 'destructive', title: 'Error', description: err.message }),
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const status = domain ? statusConfig[domain.status] : null;
  const showInput = !domain || isEditing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <CardTitle className="font-display text-lg">CUSTOM DOMAIN</CardTitle>
            <CardDescription>Connect your own domain to your salon's website.</CardDescription>
          </div>
          {status && !isEditing && (
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showInput ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Domain name</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="mydayspa.com"
                  value={domainInput}
                  onChange={(e) => {
                    setDomainInput(e.target.value);
                    if (validationError) validateDomain(e.target.value);
                  }}
                  autoCapitalize="off"
                  className="flex-1"
                />
                <Button onClick={handleSave} disabled={saveDomain.isPending || !domainInput.trim()}>
                  {saveDomain.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? 'Update' : 'Connect'}
                </Button>
                {isEditing && (
                  <Button variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                )}
              </div>
              {validationError ? (
                <p className="text-xs text-destructive">{validationError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Enter your domain without http:// or www.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between">
              <p className="text-sm font-medium">{domain!.domain}</p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} title="Edit domain">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* DNS Instructions */}
            {domain!.status !== 'active' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>Add these DNS records at your domain registrar, then click "Check DNS" to verify.</p>
                </div>

                <div className="rounded-lg border divide-y text-sm">
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">A Record</p>
                      <p className="font-medium">@ → {PLATFORM_IP}</p>
                    </div>
                    <CopyButton text={PLATFORM_IP} />
                  </div>
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">A Record</p>
                      <p className="font-medium">www → {PLATFORM_IP}</p>
                    </div>
                    <CopyButton text={PLATFORM_IP} />
                  </div>
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">TXT Record</p>
                      <p className="font-medium truncate">_lovable → lovable_verify={domain!.verification_token}</p>
                    </div>
                    <CopyButton text={`lovable_verify=${domain!.verification_token}`} />
                  </div>
                </div>
              </div>
            )}

            {domain!.status === 'active' && (
              <div className="rounded-lg bg-accent/50 border border-primary/20 p-3">
                <p className="text-sm text-primary flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Your domain is verified and active. DNS is pointing correctly.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {domain!.status !== 'active' && (
                <Button onClick={handleVerify} disabled={verifyDomain.isPending} variant="outline" className="flex-1">
                  {verifyDomain.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Check DNS
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove custom domain?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disconnect <strong>{domain!.domain}</strong> from your website. Your site will only be accessible via the platform URL.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {removeDomain.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Remove Domain
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
