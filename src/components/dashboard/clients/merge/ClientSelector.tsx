import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, X, Loader2, Phone as PhoneIcon, Mail as MailIcon, User as UserIcon } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { usePhorestClientSearch } from '@/hooks/useClientsData';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { supabase } from '@/integrations/supabase/client';
import type { MergeClient } from './MergeWizard';

interface ClientSelectorProps {
  selectedClients: MergeClient[];
  onSelectionChange: (clients: MergeClient[]) => void;
  preselectedIds?: string[];
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

export function ClientSelector({ selectedClients, onSelectionChange, preselectedIds }: ClientSelectorProps) {
  const [search, setSearch] = useState('');
  const { data: results, isLoading } = usePhorestClientSearch(search, 20);
  const { formatCurrencyWhole } = useFormatCurrency();

  // Pre-populate from URL params using phorest_clients
  useEffect(() => {
    if (!preselectedIds?.length || selectedClients.length > 0) return;

    const fetchPreselected = async () => {
      const { data, error } = await supabase
        .from('v_all_clients' as any)
        .select('id, first_name, last_name, name, email, phone, visit_count, total_spend, last_visit, is_vip, preferred_stylist_id, notes, birthday, address_line1, city, state, zip, location_id')
        .in('id', preselectedIds);

      if (!error && data?.length) {
        const clients = data.map(c => ({
          ...c,
          name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          mobile: c.phone,
          last_visit_date: c.last_visit,
        })) as unknown as MergeClient[];
        onSelectionChange(clients);
      }
    };

    fetchPreselected();
  }, [preselectedIds]);

  const handleAdd = (client: any) => {
    if (selectedClients.some(c => c.id === client.id)) return;
    onSelectionChange([...selectedClients, client as MergeClient]);
  };

  const handleRemove = (id: string) => {
    onSelectionChange(selectedClients.filter(c => c.id !== id));
  };

  const filteredResults = (results || []).filter(
    r => !selectedClients.some(s => s.id === r.id)
  );

  // Compute duplicate match reasons across all visible clients
  const duplicateMatches = useMemo(() => {
    const allClients = [...selectedClients, ...filteredResults] as any[];
    const matches = new Map<string, string[]>();

    // Build reverse maps: normalized value -> list of client ids
    const phoneMap = new Map<string, string[]>();
    const emailMap = new Map<string, string[]>();
    const nameMap = new Map<string, string[]>();

    for (const c of allClients) {
      const np = normalizePhone(c.phone || c.mobile);
      if (np.length >= 7) {
        phoneMap.set(np, [...(phoneMap.get(np) || []), c.id]);
      }
      const ne = normalizeEmail(c.email);
      if (ne) {
        emailMap.set(ne, [...(emailMap.get(ne) || []), c.id]);
      }
      const fullName = (c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim()).toLowerCase();
      if (fullName) {
        nameMap.set(fullName, [...(nameMap.get(fullName) || []), c.id]);
      }
    }

    for (const c of allClients) {
      const reasons: string[] = [];
      const np = normalizePhone(c.phone || c.mobile);
      if (np.length >= 7 && (phoneMap.get(np)?.length || 0) > 1) {
        reasons.push('phone');
      }
      const ne = normalizeEmail(c.email);
      if (ne && (emailMap.get(ne)?.length || 0) > 1) {
        reasons.push('email');
      }
      const fullName = (c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim()).toLowerCase();
      if (fullName && (nameMap.get(fullName)?.length || 0) > 1 && reasons.length === 0) {
        reasons.push('name');
      }
      if (reasons.length > 0) {
        matches.set(c.id, reasons);
      }
    }

    return matches;
  }, [filteredResults, selectedClients]);

  const matchLabel = (reason: string) => {
    switch (reason) {
      case 'phone': return 'Same Phone';
      case 'email': return 'Same Email';
      case 'name': return 'Same Name';
      default: return reason;
    }
  };

  const MatchIcon = ({ reason }: { reason: string }) => {
    switch (reason) {
      case 'phone': return <PhoneIcon className="w-3 h-3" />;
      case 'email': return <MailIcon className="w-3 h-3" />;
      case 'name': return <UserIcon className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Selected clients */}
        {selectedClients.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Selected ({selectedClients.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedClients.map(client => {
                const reasons = duplicateMatches.get(client.id);
                return (
                  <Tooltip key={client.id}>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="gap-2 py-1.5 px-3">
                        {client.first_name} {client.last_name}
                        {reasons && (
                          <span className="inline-flex items-center gap-0.5 text-amber-500">
                            {reasons.map(r => <MatchIcon key={r} reason={r} />)}
                          </span>
                        )}
                        <button onClick={() => handleRemove(client.id)} className="hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    </TooltipTrigger>
                    {reasons && (
                      <TooltipContent>
                        <p className="text-xs">Match: {reasons.map(matchLabel).join(', ')}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name, email, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {isLoading && (
            <DashboardLoader size="sm" className="py-8" />
          )}
          {!isLoading && search && filteredResults.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">No clients found</p>
          )}
          {filteredResults.map(client => {
            const reasons = duplicateMatches.get(client.id);
            const hasPhoneMatch = reasons?.includes('phone');
            const hasEmailMatch = reasons?.includes('email');

            return (
              <button
                key={client.id}
                onClick={() => handleAdd(client)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 text-left transition-colors"
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="font-display text-xs bg-primary/10">
                    {client.first_name?.[0]}{client.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{client.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {client.email && (
                      <span className={`truncate ${hasEmailMatch ? 'text-amber-500 font-medium' : ''}`}>
                        {client.email}
                      </span>
                    )}
                    {client.phone && (
                      <span className={hasPhoneMatch ? 'text-amber-500 font-medium' : ''}>
                        {client.phone}
                      </span>
                    )}
                  </div>
                  {reasons && reasons.length > 0 && (
                    <div className="flex gap-1.5 mt-1">
                      {reasons.map(reason => (
                        <span
                          key={reason}
                          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                            reason === 'name'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-amber-500/15 text-amber-500 border border-amber-500/25'
                          }`}
                        >
                          <MatchIcon reason={reason} />
                          {matchLabel(reason)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-sm">{formatCurrencyWhole(Number(client.total_spend || 0))}</p>
                  <p className="text-xs text-muted-foreground">{client.visit_count || 0} visits</p>
                </div>
              </button>
            );
          })}
        </div>

        {!search && selectedClients.length < 2 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            Search for clients to begin. Select at least 2 profiles to merge.
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
