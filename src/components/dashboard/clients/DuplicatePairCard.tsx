import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  GitMerge, Phone, Mail, User, Calendar, DollarSign, 
  UserX, Users, Home, Eye 
} from 'lucide-react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';

interface DuplicatePairCardProps {
  duplicate: any;
  canonical: any;
  reasons: string[];
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

function getMatchLabel(reason: string): string {
  switch (reason) {
    case 'phone': return 'Same Phone';
    case 'email': return 'Same Email';
    case 'name': return 'Same Name';
    default: return 'Match';
  }
}

function getMatchIcon(reason: string) {
  switch (reason) {
    case 'phone': return Phone;
    case 'email': return Mail;
    case 'name': return User;
    default: return GitMerge;
  }
}

function getMatchValue(duplicate: any, canonical: any, reason: string): string | null {
  switch (reason) {
    case 'phone': return duplicate.phone || canonical.phone || null;
    case 'email': return duplicate.email || canonical.email || null;
    case 'name': return null;
    default: return null;
  }
}

function ProfileColumn({ 
  data, 
  label, 
  isDuplicate, 
  phoneMatch, 
  emailMatch, 
  nameMatch,
  formatCurrency,
  formatDateFn,
  onViewProfile
}: { 
  data: any; 
  label: string;
  isDuplicate: boolean;
  phoneMatch: boolean; 
  emailMatch: boolean; 
  nameMatch: boolean;
  formatCurrency: (n: number) => string;
  formatDateFn: (d: Date, f: string) => string;
  onViewProfile: (client: any) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3 cursor-pointer transition-colors hover:bg-muted/50 group",
        isDuplicate
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border bg-card/50"
      )}
      onClick={() => onViewProfile(data)}
    >
      {/* Label */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-[10px] font-medium tracking-wider uppercase font-display",
          isDuplicate ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
        )}>
          {label}
        </span>
        <Eye className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarFallback className="font-display text-xs bg-primary/10">
            {data.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className={cn(
            "font-sans text-sm font-medium truncate",
            nameMatch && "text-amber-600 dark:text-amber-400"
          )}>
            {data.name}
          </p>
        </div>
      </div>

      {/* Contact info with match highlights */}
      <div className="space-y-1.5">
        {data.email && (
          <div className={cn(
            "flex items-center gap-2 text-xs",
            emailMatch ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )}>
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{data.email}</span>
            {emailMatch && (
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                match
              </Badge>
            )}
          </div>
        )}
        {data.phone && (
          <div className={cn(
            "flex items-center gap-2 text-xs",
            phoneMatch ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )}>
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{data.phone}</span>
            {phoneMatch && (
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                match
              </Badge>
            )}
          </div>
        )}
        {!data.email && !data.phone && (
          <p className="text-xs text-muted-foreground italic">No contact info</p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/50">
        <span className="flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          {formatCurrency(Number(data.total_spend || 0))}
        </span>
        <span>{data.visit_count || 0} visits</span>
        {data.last_visit && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDateFn(new Date(data.last_visit), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  );
}

export function DuplicatePairCard({ 
  duplicate, 
  canonical, 
  reasons, 
  onViewProfile, 
  onMerge, 
  onDismiss, 
  isDismissing 
}: DuplicatePairCardProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const [reasonPopoverOpen, setReasonPopoverOpen] = useState(false);

  const phoneMatch = !!(duplicate.phone && canonical.phone && normalizePhone(duplicate.phone) === normalizePhone(canonical.phone));
  const emailMatch = !!(duplicate.email && canonical.email && duplicate.email.toLowerCase() === canonical.email.toLowerCase());
  const nameMatch = !!(duplicate.name && canonical.name && duplicate.name.toLowerCase() === canonical.name.toLowerCase());

  // Build display reasons
  const displayReasons = reasons.length > 0 && reasons[0] !== 'match' ? reasons : (
    [phoneMatch && 'phone', emailMatch && 'email', nameMatch && 'name'].filter(Boolean) as string[]
  );
  if (displayReasons.length === 0) displayReasons.push('match');

  const handleDismissWithReason = (reason: string) => {
    setReasonPopoverOpen(false);
    onDismiss?.(duplicate.id, canonical.id, reason);
  };

  return (
    <Card className="overflow-hidden border-amber-500/20 bg-card/80 backdrop-blur-sm">
      {/* Header: match reason */}
      <div className="px-4 py-3 bg-amber-500/5 border-b border-amber-500/15 flex items-center gap-2 flex-wrap">
        <GitMerge className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="font-display text-xs tracking-wider uppercase text-amber-700 dark:text-amber-300">
          Matching:
        </span>
        {displayReasons.map((reason) => {
          const Icon = getMatchIcon(reason);
          const value = getMatchValue(duplicate, canonical, reason);
          return (
            <Badge 
              key={reason} 
              variant="outline" 
              className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300 dark:border-amber-500/30 gap-1"
            >
              <Icon className="w-3 h-3" />
              {getMatchLabel(reason)}
              {value && (
                <span className="text-amber-600/70 dark:text-amber-400/70 font-normal ml-0.5">
                  ({value})
                </span>
              )}
            </Badge>
          );
        })}
      </div>

      {/* Side-by-side profiles */}
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ProfileColumn
            data={duplicate}
            label="Flagged Duplicate"
            isDuplicate={true}
            phoneMatch={phoneMatch}
            emailMatch={emailMatch}
            nameMatch={nameMatch}
            formatCurrency={formatCurrencyWhole}
            formatDateFn={formatDate}
            onViewProfile={onViewProfile}
          />
          <ProfileColumn
            data={canonical}
            label="Original Profile"
            isDuplicate={false}
            phoneMatch={phoneMatch}
            emailMatch={emailMatch}
            nameMatch={nameMatch}
            formatCurrency={formatCurrencyWhole}
            formatDateFn={formatDate}
            onViewProfile={onViewProfile}
          />
        </div>
      </CardContent>

      {/* Footer: actions */}
      <CardFooter className="px-4 py-3 border-t border-border/50 flex items-center justify-end gap-2">
        {onDismiss && (
          <Popover open={reasonPopoverOpen} onOpenChange={setReasonPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={isDismissing}
              >
                <UserX className="w-4 h-4" />
                Not a Duplicate
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
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
          className="gap-1.5"
          onClick={() => onMerge(duplicate.id, canonical.id)}
        >
          <GitMerge className="w-4 h-4" /> Merge Profiles
        </Button>
      </CardFooter>
    </Card>
  );
}
