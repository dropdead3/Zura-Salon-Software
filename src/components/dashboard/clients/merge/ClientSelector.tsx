import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, X, Loader2 } from 'lucide-react';
import { usePhorestClientSearch } from '@/hooks/useClientsData';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { supabase } from '@/integrations/supabase/client';
import type { MergeClient } from './MergeWizard';

interface ClientSelectorProps {
  selectedClients: MergeClient[];
  onSelectionChange: (clients: MergeClient[]) => void;
  preselectedIds?: string[];
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
        .from('phorest_clients')
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

  return (
    <div className="space-y-4">
      {/* Selected clients */}
      {selectedClients.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Selected ({selectedClients.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedClients.map(client => (
              <Badge key={client.id} variant="secondary" className="gap-2 py-1.5 px-3">
                {client.first_name} {client.last_name}
                <button onClick={() => handleRemove(client.id)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
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
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && search && filteredResults.length === 0 && (
          <p className="text-center py-8 text-muted-foreground text-sm">No clients found</p>
        )}
        {filteredResults.map(client => (
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
                {client.email && <span className="truncate">{client.email}</span>}
                {client.phone && <span>{client.phone}</span>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-sm">{formatCurrencyWhole(Number(client.total_spend || 0))}</p>
              <p className="text-xs text-muted-foreground">{client.visit_count || 0} visits</p>
            </div>
          </button>
        ))}
      </div>

      {!search && selectedClients.length < 2 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Search for clients to begin. Select at least 2 profiles to merge.
        </p>
      )}
    </div>
  );
}
