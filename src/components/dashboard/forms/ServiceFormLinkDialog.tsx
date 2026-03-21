import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import type { FormTemplate } from '@/hooks/useFormTemplates';
import { useLinkFormToMultipleServices, useServiceFormRequirements } from '@/hooks/useServiceFormRequirements';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ServiceFormLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: FormTemplate | null;
}

interface Service {
  id: string;
  name: string;
  category: string | null;
}

export function ServiceFormLinkDialog({ open, onOpenChange, template }: ServiceFormLinkDialogProps) {
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [signingFrequency, setSigningFrequency] = useState<'once' | 'per_visit' | 'annually'>('once');
  const [searchQuery, setSearchQuery] = useState('');
  
  const linkFormToServices = useLinkFormToMultipleServices();
  const { data: existingLinks } = useServiceFormRequirements();

  // Fetch services
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['phorest-services-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phorest_services')
        .select('id, name, category')
        .eq('is_active', true)
        .order('category')
        .order('name');
      
      if (error) throw error;
      return data as Service[];
    },
  });

  // Pre-select already linked services when dialog opens
  useEffect(() => {
    if (open && template && existingLinks) {
      const linkedServiceIds = existingLinks
        .filter(link => link.form_template_id === template.id)
        .map(link => link.service_id);
      setSelectedServices(new Set(linkedServiceIds));
    }
  }, [open, template, existingLinks]);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (!template || selectedServices.size === 0) return;

    await linkFormToServices.mutateAsync({
      formTemplateId: template.id,
      serviceIds: Array.from(selectedServices),
      signingFrequency,
      isRequired: true,
    });

    onOpenChange(false);
  };

  // Group services by category
  const groupedServices = services?.reduce((acc, service) => {
    const category = service.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>) || {};

  // Filter by search
  const filteredGroups = Object.entries(groupedServices).reduce((acc, [category, services]) => {
    const filtered = services.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, Service[]>);

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Link Form to Services</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select which services require "{template.name}"
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Signing Frequency</Label>
            <Select value={signingFrequency} onValueChange={(v) => setSigningFrequency(v as typeof signingFrequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Once (never again for this client)</SelectItem>
                <SelectItem value="per_visit">Per Visit (every appointment)</SelectItem>
                <SelectItem value="annually">Annually (once per year)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px] border rounded-lg p-3">
            {servicesLoading ? (
              <p className="text-muted-foreground text-sm">Loading services...</p>
            ) : Object.keys(filteredGroups).length === 0 ? (
              <p className="text-muted-foreground text-sm">No services found</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(filteredGroups).map(([category, services]) => (
                  <div key={category}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      {category}
                    </p>
                    <div className="space-y-1">
                      {services.map((service) => (
                        <label
                          key={service.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedServices.has(service.id)}
                            onCheckedChange={() => toggleService(service.id)}
                          />
                          <span className="text-sm">{service.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedServices.size} service{selectedServices.size !== 1 ? 's' : ''} selected
            </span>
            {selectedServices.size > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedServices(new Set())}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={selectedServices.size === 0 || linkFormToServices.isPending}
          >
            {linkFormToServices.isPending ? 'Saving...' : 'Link to Services'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
