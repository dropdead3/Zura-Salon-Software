import { useState } from 'react';
import { Database, Plus, Trash2, ArrowRight, Copy, Loader2 } from 'lucide-react';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import { PlatformSwitch as Switch } from '@/components/platform/ui/PlatformSwitch';
import { PlatformLabel as Label } from '@/components/platform/ui/PlatformLabel';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import {
  useImportTemplates,
  useCreateImportTemplate,
  useUpdateImportTemplate,
  useDeleteImportTemplate,
  type FieldMapping,
  type Transformations,
} from '@/hooks/useImportTemplates';
import { toast } from 'sonner';

const SOURCE_SYSTEMS = [
  { value: 'phorest', label: 'Phorest' },
  { value: 'vagaro', label: 'Vagaro' },
  { value: 'salon_iris', label: 'Salon Iris' },
  { value: 'csv', label: 'CSV File' },
];

const ENTITY_TYPES = [
  { value: 'clients', label: 'Clients' },
  { value: 'services', label: 'Services' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'staff', label: 'Staff' },
];

const TARGET_COLUMNS: Record<string, string[]> = {
  clients: ['first_name', 'last_name', 'email', 'phone', 'mobile', 'notes', 'is_vip', 'created_at'],
  services: ['name', 'description', 'category', 'duration_minutes', 'price', 'is_active'],
  appointments: ['appointment_date', 'start_time', 'end_time', 'client_name', 'client_email', 'service_name', 'staff_name', 'status', 'notes'],
  staff: ['first_name', 'last_name', 'email', 'phone', 'role', 'hire_date'],
};

const DATE_FORMATS = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-01-31)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (01/31/2024)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/01/2024)' },
  { value: 'ISO8601', label: 'ISO 8601' },
];

const PHONE_FORMATS = [
  { value: 'E.164', label: 'E.164 (+15551234567)' },
  { value: 'national', label: 'National ((555) 123-4567)' },
  { value: 'digits', label: 'Digits Only (5551234567)' },
];

export function PlatformImportTemplatesTab() {
  const [selectedSource, setSelectedSource] = useState('phorest');
  const [selectedEntity, setSelectedEntity] = useState('clients');
  
  const { data: templates, isLoading } = useImportTemplates(selectedSource, selectedEntity);
  const createTemplate = useCreateImportTemplate();
  const updateTemplate = useUpdateImportTemplate();
  const deleteTemplate = useDeleteImportTemplate();

  const currentTemplate = templates?.[0];
  const [localMappings, setLocalMappings] = useState<FieldMapping[]>([]);
  const [localTransformations, setLocalTransformations] = useState<Transformations>({
    dateFormat: 'YYYY-MM-DD',
    phoneFormat: 'E.164',
    normalizeNames: true,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when template changes
  useState(() => {
    if (currentTemplate) {
      setLocalMappings(currentTemplate.field_mappings || []);
      setLocalTransformations(currentTemplate.transformations || {
        dateFormat: 'YYYY-MM-DD',
        phoneFormat: 'E.164',
        normalizeNames: true,
      });
    } else {
      setLocalMappings([]);
      setLocalTransformations({
        dateFormat: 'YYYY-MM-DD',
        phoneFormat: 'E.164',
        normalizeNames: true,
      });
    }
  });

  const addMapping = () => {
    setLocalMappings(prev => [...prev, { sourceField: '', targetColumn: '' }]);
    setHasChanges(true);
  };

  const updateMapping = (index: number, field: keyof FieldMapping, value: string) => {
    setLocalMappings(prev => prev.map((m, i) => 
      i === index ? { ...m, [field]: value } : m
    ));
    setHasChanges(true);
  };

  const removeMapping = (index: number) => {
    setLocalMappings(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateTransformation = <K extends keyof Transformations>(key: K, value: Transformations[K]) => {
    setLocalTransformations(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (currentTemplate) {
      updateTemplate.mutate({
        id: currentTemplate.id,
        field_mappings: localMappings,
        transformations: localTransformations,
      }, {
        onSuccess: () => setHasChanges(false),
      });
    } else {
      createTemplate.mutate({
        source_system: selectedSource,
        entity_type: selectedEntity,
        field_mappings: localMappings,
        transformations: localTransformations,
        is_default: true,
        organization_id: null,
      }, {
        onSuccess: () => setHasChanges(false),
      });
    }
  };

  const handleClone = () => {
    toast.info('Clone functionality will copy this template for a specific organization');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full bg-slate-800" />
        <Skeleton className="h-64 w-full bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Source Selection */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-violet-400" />
            Import Templates
          </PlatformCardTitle>
          <PlatformCardDescription>
            Configure default field mappings for data imports from different CRM systems
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Source System</Label>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_SYSTEMS.map(source => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Entity Type</Label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(entity => (
                    <SelectItem key={entity.value} value={entity.value}>
                      {entity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Field Mappings */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle>Field Mappings</PlatformCardTitle>
          <PlatformCardDescription>
            Map source fields to target database columns
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-3">
          <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-2 text-sm font-medium text-slate-400 px-2">
            <span>Source Field</span>
            <span></span>
            <span>Target Column</span>
            <span></span>
          </div>

          {localMappings.map((mapping, index) => (
            <div key={index} className="grid grid-cols-[1fr,auto,1fr,auto] gap-2 items-center">
              <Input
                placeholder="e.g., client_name"
                value={mapping.sourceField}
                onChange={(e) => updateMapping(index, 'sourceField', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <ArrowRight className="h-4 w-4 text-slate-500" />
              <Select 
                value={mapping.targetColumn} 
                onValueChange={(v) => updateMapping(index, 'targetColumn', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_COLUMNS[selectedEntity]?.map(col => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <PlatformButton
                variant="ghost"
                size="sm"
                onClick={() => removeMapping(index)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </PlatformButton>
            </div>
          ))}

          <PlatformButton
            variant="secondary"
            size="sm"
            onClick={addMapping}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Field Mapping
          </PlatformButton>
        </PlatformCardContent>
      </PlatformCard>

      {/* Transformations */}
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle>Transformations</PlatformCardTitle>
          <PlatformCardDescription>
            Configure data transformations applied during import
          </PlatformCardDescription>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Date Format</Label>
              <Select 
                value={localTransformations.dateFormat || 'YYYY-MM-DD'} 
                onValueChange={(v) => updateTransformation('dateFormat', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map(format => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Phone Format</Label>
              <Select 
                value={localTransformations.phoneFormat || 'E.164'} 
                onValueChange={(v) => updateTransformation('phoneFormat', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHONE_FORMATS.map(format => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
            <div>
              <Label className="text-white">Normalize Names to Title Case</Label>
              <p className="text-sm text-slate-400">Convert names like "JOHN DOE" to "John Doe"</p>
            </div>
            <Switch
              checked={localTransformations.normalizeNames ?? true}
              onCheckedChange={(v) => updateTransformation('normalizeNames', v)}
            />
          </div>
        </PlatformCardContent>
      </PlatformCard>

      {/* Actions */}
      <div className="flex justify-between">
        <PlatformButton variant="secondary" onClick={handleClone}>
          <Copy className="h-4 w-4 mr-2" />
          Clone for Organization
        </PlatformButton>

        <PlatformButton 
          onClick={handleSave} 
          disabled={!hasChanges || createTemplate.isPending || updateTemplate.isPending}
        >
          {(createTemplate.isPending || updateTemplate.isPending) ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Template'
          )}
        </PlatformButton>
      </div>
    </div>
  );
}
