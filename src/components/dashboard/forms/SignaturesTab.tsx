import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, FileSignature, Download } from 'lucide-react';
import { useAllSignatures } from '@/hooks/useClientFormSignatures';
import { format } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function SignaturesTab() {
  const { formatDate } = useFormatDate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: signatures, isLoading } = useAllSignatures({ limit: 100 });

  // Fetch client names for display
  const { data: clients } = useQuery({
    queryKey: ['phorest-clients-basic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_clients')
        .select('phorest_client_id, name');
      
      if (error) throw error;
      return data;
    },
  });

  const clientMap = new Map(clients?.map(c => [c.phorest_client_id, c.name]) || []);

  // Filter signatures by search
  const filteredSignatures = signatures?.filter((sig) => {
    const clientName = clientMap.get(sig.client_id) || sig.client_id;
    const formName = sig.form_template?.name || '';
    const search = searchQuery.toLowerCase();
    
    return (
      clientName.toLowerCase().includes(search) ||
      formName.toLowerCase().includes(search) ||
      sig.typed_signature?.toLowerCase().includes(search)
    );
  });

  const handleExport = () => {
    if (!filteredSignatures?.length) return;

    const csvContent = [
      ['Date', 'Client', 'Form', 'Version', 'Signature'].join(','),
      ...filteredSignatures.map((sig) => [
        format(new Date(sig.signed_at), 'yyyy-MM-dd HH:mm'),
        clientMap.get(sig.client_id) || sig.client_id,
        sig.form_template?.name || 'Unknown',
        sig.form_version,
        sig.typed_signature || '',
      ].map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-signatures-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client, form, or signature..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!filteredSignatures?.length}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {!filteredSignatures?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No signatures recorded yet</p>
            <p className="text-sm">Signatures will appear here when clients sign forms</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Signature</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignatures.map((sig) => (
                  <TableRow key={sig.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(new Date(sig.signed_at), 'MMM d, yyyy')}
                      <span className="text-xs text-muted-foreground block">
                        {formatDate(new Date(sig.signed_at), 'h:mm a')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {clientMap.get(sig.client_id) || (
                        <span className="text-muted-foreground text-xs">{sig.client_id}</span>
                      )}
                    </TableCell>
                    <TableCell>{sig.form_template?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {sig.form_version}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-serif italic">
                      {sig.typed_signature || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
