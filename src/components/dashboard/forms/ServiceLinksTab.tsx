import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Link2Off, FileCheck } from 'lucide-react';
import { 
  useServiceFormRequirements, 
  useUnlinkFormFromService,
  useUpdateFormRequirement,
} from '@/hooks/useServiceFormRequirements';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface Service {
  id: string;
  name: string;
  category: string | null;
}

const FREQUENCY_LABELS = {
  once: 'Once',
  per_visit: 'Per Visit',
  annually: 'Annually',
} as const;

export function ServiceLinksTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [unlinkConfirmId, setUnlinkConfirmId] = useState<string | null>(null);
  
  const { data: requirements, isLoading } = useServiceFormRequirements();
  const unlinkForm = useUnlinkFormFromService();
  const updateRequirement = useUpdateFormRequirement();

  // Fetch services
  const { data: services } = useQuery({
    queryKey: ['phorest-services-basic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_services')
        .select('id, name, category');
      
      if (error) throw error;
      return data as Service[];
    },
  });

  const serviceMap = new Map(services?.map(s => [s.id, s]) || []);

  // Group requirements by service
  const groupedByService = requirements?.reduce((acc, req) => {
    const service = serviceMap.get(req.service_id);
    const serviceName = service?.name || 'Unknown Service';
    if (!acc[serviceName]) {
      acc[serviceName] = { service, requirements: [] };
    }
    acc[serviceName].requirements.push(req);
    return acc;
  }, {} as Record<string, { service: Service | undefined; requirements: typeof requirements }>) || {};

  // Filter by search
  const filteredGroups = Object.entries(groupedByService).filter(([serviceName]) =>
    serviceName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFrequencyChange = async (requirementId: string, frequency: 'once' | 'per_visit' | 'annually') => {
    await updateRequirement.mutateAsync({
      id: requirementId,
      updates: { signing_frequency: frequency },
    });
  };

  const handleUnlink = async () => {
    if (!unlinkConfirmId) return;
    await unlinkForm.mutateAsync(unlinkConfirmId);
    setUnlinkConfirmId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No form requirements configured</p>
            <p className="text-sm">Link forms to services from the Templates tab</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(([serviceName, { service, requirements: reqs }]) => (
            <Card key={serviceName}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{serviceName}</h4>
                    {service?.category && (
                      <p className="text-xs text-muted-foreground">{service.category}</p>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {reqs?.length || 0} form{(reqs?.length || 0) !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {reqs?.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm truncate">
                          {req.form_template?.name || 'Unknown Form'}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {req.form_template?.version}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={req.signing_frequency}
                          onValueChange={(v) => handleFrequencyChange(req.id, v as typeof req.signing_frequency)}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once">Once</SelectItem>
                            <SelectItem value="per_visit">Per Visit</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setUnlinkConfirmId(req.id)}
                        >
                          <Link2Off className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!unlinkConfirmId} onOpenChange={(open) => !open && setUnlinkConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Form from Service?</AlertDialogTitle>
            <AlertDialogDescription>
              This service will no longer require this form to be signed. 
              Existing signatures will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
