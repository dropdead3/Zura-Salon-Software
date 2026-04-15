import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, GitMerge, Phone, Mail, User, ArrowRight, Calendar, DollarSign, UserX, Users, Home } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';

interface DuplicateDrilldownProps {
  client: any;
  canonicalClientId: string;
  duplicateReasons: string[];
  onViewProfile: (client: any) => void;
  onMerge: (duplicateId: string, canonicalId: string) => void;
  onDismiss?: (clientId: string, canonicalId: string, reason: string) => void;
  isDismissing?: boolean;
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

const DISMISS_REASONS = [
  { value: 'family', label: 'Family Members', icon: Users },
  { value: 'household', label: 'Same Household', icon: Home },
  { value: 'other', label: 'Other', icon: UserX },
] as const;

export function DuplicateDrilldown({ client, canonicalClientId, duplicateReasons, onViewProfile, onMerge, onDismiss, isDismissing }: DuplicateDrilldownProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const [reasonPopoverOpen, setReasonPopoverOpen] = useState(false);

  const { data: canonical, isLoading } = useQuery({
    queryKey: ['canonical-client', canonicalClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_all_clients' as any)
        .select('*')
        .eq('id', canonicalClientId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!canonicalClientId,
  });

  if (isLoading) {
    return <DashboardLoader size="sm" className="py-4" />;
  }

  if (!canonical) {
    return (
      <div className="text-center py-3 text-xs text-muted-foreground">
        Original profile not found.
      </div>
    );
  }

  // Compute detailed matches
  const phoneMatch = !!(client.phone && canonical.phone && normalizePhone(client.phone) === normalizePhone(canonical.phone));
  const emailMatch = !!(client.email && canonical.email && client.email.toLowerCase() === canonical.email.toLowerCase());
  const nameMatch = !!(client.name && canonical.name && client.name.toLowerCase() === canonical.name.toLowerCase());

  const profiles = [
    { label: 'This Profile', data: client, isDuplicate: true },
    { label: 'Original Profile', data: canonical, isDuplicate: false },
  ];

  const handleDismissWithReason = (reason: string) => {
    setReasonPopoverOpen(false);
    onDismiss?.(client.id, canonicalClientId, reason);
  };

  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Duplicate Match Found
          </span>
          <div className="flex gap-1">
            {phoneMatch && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400 gap-0.5">
                <Phone className="w-2.5 h-2.5" /> Same Phone
              </Badge>
            )}
            {emailMatch && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400 gap-0.5">
                <Mail className="w-2.5 h-2.5" /> Same Email
              </Badge>
            )}
            {nameMatch && !phoneMatch && !emailMatch && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400 gap-0.5">
                <User className="w-2.5 h-2.5" /> Same Name
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDismiss && (
            <Popover open={reasonPopoverOpen} onOpenChange={setReasonPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  disabled={isDismissing}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isDismissing ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                  Not a Duplicate
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Why not a duplicate?</p>
                {DISMISS_REASONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-md hover:bg-muted transition-colors text-left"
                    onClick={() => handleDismissWithReason(value)}
                  >
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    {label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
          <Button
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onMerge(client.id, canonicalClientId);
            }}
          >
            <GitMerge className="w-3 h-3" /> Merge Profiles
          </Button>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-3">
        {profiles.map(({ label, data, isDuplicate }) => (
          <div
            key={data.id}
            className={cn(
              "rounded-lg border p-3 space-y-2 cursor-pointer transition-colors hover:bg-muted/50",
              isDuplicate
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border bg-card/50"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(data);
            }}
          >
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-[10px] font-display font-medium tracking-wide uppercase",
                isDuplicate ? "text-amber-500" : "text-muted-foreground"
              )}>
                {label}
              </span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="font-display text-[10px] bg-primary/10">
                  {data.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium truncate", nameMatch && "text-amber-500")}>{data.name}</p>
              </div>
            </div>

            {/* Contact info with match highlights */}
            <div className="space-y-1 text-xs">
              {data.email && (
                <div className={cn("flex items-center gap-1.5", emailMatch ? "text-amber-500" : "text-muted-foreground")}>
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{data.email}</span>
                  {emailMatch && <Badge variant="outline" className="text-[9px] py-0 px-1 bg-amber-500/10 border-amber-500/20 text-amber-500">match</Badge>}
                </div>
              )}
              {data.phone && (
                <div className={cn("flex items-center gap-1.5", phoneMatch ? "text-amber-500" : "text-muted-foreground")}>
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>{data.phone}</span>
                  {phoneMatch && <Badge variant="outline" className="text-[9px] py-0 px-1 bg-amber-500/10 border-amber-500/20 text-amber-500">match</Badge>}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/50">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {formatCurrencyWhole(Number(data.total_spend || 0))}
              </span>
              <span>{data.visit_count || 0} visits</span>
              {data.last_visit && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(new Date(data.last_visit), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
