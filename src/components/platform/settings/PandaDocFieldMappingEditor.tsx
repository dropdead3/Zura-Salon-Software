import { useState, useEffect } from 'react';
import { Plus, Trash2, RotateCcw, Save, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import { tokens } from '@/lib/design-tokens';
import {
  usePandaDocFieldMapping,
  useUpdatePandaDocFieldMapping,
  DEFAULT_PANDADOC_MAPPING,
  BILLING_COLUMNS,
  type PandaDocFieldMapping,
} from '@/hooks/usePandaDocFieldMapping';

interface MappingRow {
  id: string;
  pandaDocField: string;
  billingColumn: string;
}

function mappingToRows(mapping: PandaDocFieldMapping): MappingRow[] {
  return Object.entries(mapping).map(([pandaDocField, billingColumn], index) => ({
    id: `row-${index}-${Date.now()}`,
    pandaDocField,
    billingColumn,
  }));
}

function rowsToMapping(rows: MappingRow[]): PandaDocFieldMapping {
  const mapping: PandaDocFieldMapping = {};
  rows.forEach(row => {
    if (row.pandaDocField.trim()) {
      mapping[row.pandaDocField.trim()] = row.billingColumn;
    }
  });
  return mapping;
}

export function PandaDocFieldMappingEditor() {
  const { data: savedMapping, isLoading } = usePandaDocFieldMapping();
  const updateMapping = useUpdatePandaDocFieldMapping();
  
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize rows from saved mapping
  useEffect(() => {
    if (savedMapping && rows.length === 0) {
      setRows(mappingToRows(savedMapping));
    }
  }, [savedMapping]);

  // Track changes
  useEffect(() => {
    if (savedMapping) {
      const currentMapping = rowsToMapping(rows);
      const savedStr = JSON.stringify(savedMapping);
      const currentStr = JSON.stringify(currentMapping);
      setHasChanges(savedStr !== currentStr);
    }
  }, [rows, savedMapping]);

  const handleAddRow = () => {
    setRows([...rows, {
      id: `row-${Date.now()}`,
      pandaDocField: '',
      billingColumn: 'notes',
    }]);
  };

  const handleRemoveRow = (id: string) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const handleUpdateRow = (id: string, field: 'pandaDocField' | 'billingColumn', value: string) => {
    setRows(rows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleSave = () => {
    const mapping = rowsToMapping(rows);
    updateMapping.mutate(mapping);
  };

  const handleReset = () => {
    setRows(mappingToRows(DEFAULT_PANDADOC_MAPPING));
  };

  if (isLoading) {
    return (
      <PlatformCard variant="glass">
        <PlatformCardHeader>
          <PlatformCardTitle>Field Mapping</PlatformCardTitle>
        </PlatformCardHeader>
        <PlatformCardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="flex-1 h-10 bg-slate-800 rounded-lg" />
                <div className="w-8 h-8" />
                <div className="flex-1 h-10 bg-slate-800 rounded-lg" />
                <div className="w-8 h-8" />
              </div>
            ))}
          </div>
        </PlatformCardContent>
      </PlatformCard>
    );
  }

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader>
        <div className="flex items-center justify-between">
          <div>
            <PlatformCardTitle>Field Mapping</PlatformCardTitle>
            <PlatformCardDescription>
              Map PandaDoc document fields to billing configuration columns
            </PlatformCardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
                Unsaved changes
              </span>
            )}
            <Button
              variant="outline"
              size={tokens.button.card}
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </PlatformCardHeader>
      <PlatformCardContent className="space-y-4">
        {/* Header row */}
        <div className="flex items-center gap-3 text-sm text-slate-400 px-1">
          <div className="flex-1">
            <PlatformLabel>PandaDoc Field Name</PlatformLabel>
          </div>
          <div className="w-8" />
          <div className="flex-1">
            <PlatformLabel>Billing Column</PlatformLabel>
          </div>
          <div className="w-8" />
        </div>

        {/* Mapping rows */}
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3">
              <Input
                value={row.pandaDocField}
                onChange={(e) => handleUpdateRow(row.id, 'pandaDocField', e.target.value)}
                placeholder="e.g., term_start_date"
                className="flex-1 bg-slate-900/50 border-slate-700 text-slate-200 rounded-lg"
                autoCapitalize="none"
              />
              <ArrowRight className="h-4 w-4 text-slate-500 shrink-0" />
              <Select
                value={row.billingColumn}
                onValueChange={(value) => handleUpdateRow(row.id, 'billingColumn', value)}
              >
                <SelectTrigger className="flex-1 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_COLUMNS.map((col) => (
                    <SelectItem key={col.value} value={col.value}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{col.label}</span>
                        <span className="text-xs text-slate-500">{col.type}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveRow(row.id)}
                className="shrink-0 text-slate-400 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
          <Button
            variant="outline"
            size={tokens.button.card}
            onClick={handleAddRow}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Mapping
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMapping.isPending}
            className="gap-2 bg-violet-600 hover:bg-violet-700"
          >
            <Save className="h-4 w-4" />
            {updateMapping.isPending ? 'Saving...' : 'Save Mappings'}
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-slate-500 pt-2">
          Field names should match exactly as they appear in your PandaDoc templates. 
          The "Plan (lookup by name)" column will search for a matching subscription plan.
        </p>
      </PlatformCardContent>
    </PlatformCard>
  );
}
