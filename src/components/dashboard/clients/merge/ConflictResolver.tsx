import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Crown, AlertTriangle } from 'lucide-react';
import type { MergeClient } from './MergeWizard';

interface ConflictResolverProps {
  primaryClient: MergeClient;
  secondaryClients: MergeClient[];
  fieldResolutions: Record<string, any>;
  onResolutionsChange: (resolutions: Record<string, any>) => void;
}

interface FieldConfig {
  key: string;
  label: string;
  isConsent?: boolean;
}

const FIELDS: FieldConfig[] = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'mobile', label: 'Mobile Phone' },
  { key: 'phone', label: 'Phone' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'address_line1', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP Code' },
  { key: 'preferred_stylist_id', label: 'Preferred Stylist' },
  { key: 'location_id', label: 'Preferred Location' },
  { key: 'is_vip', label: 'VIP Status' },
  { key: 'reminder_email_opt_in', label: 'Email Opt-in', isConsent: true },
  { key: 'reminder_sms_opt_in', label: 'SMS Opt-in', isConsent: true },
];

export function ConflictResolver({ primaryClient, secondaryClients, fieldResolutions, onResolutionsChange }: ConflictResolverProps) {
  const allClients = [primaryClient, ...secondaryClients];

  // Find fields with differing values
  const conflictFields = FIELDS.filter(field => {
    const values = allClients.map(c => (c as any)[field.key]);
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonNull.length <= 1) return false;
    return new Set(nonNull.map(String)).size > 1;
  });

  const handleSelect = (fieldKey: string, value: any) => {
    onResolutionsChange({ ...fieldResolutions, [fieldKey]: value });
  };

  if (conflictFields.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No field conflicts detected. You can proceed.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Notes from secondary profiles will be appended with attribution.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        The following fields have different values. Choose which value to keep for the merged profile.
      </p>

      {conflictFields.map(field => {
        const currentValue = fieldResolutions[field.key] ?? (primaryClient as any)[field.key];

        return (
          <div key={field.key} className="space-y-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{field.label}</p>
              {field.isConsent && (
                <Badge variant="outline" className="text-xs gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Consent field
                </Badge>
              )}
            </div>

            <RadioGroup
              value={String(currentValue ?? '')}
              onValueChange={(val) => {
                // Parse back to original type
                let parsed: any = val;
                if (val === 'true') parsed = true;
                else if (val === 'false') parsed = false;
                else if (val === 'null') parsed = null;
                handleSelect(field.key, parsed);
              }}
            >
              <div className="grid gap-2">
                {allClients.map(client => {
                  const value = (client as any)[field.key];
                  if (value === null || value === undefined || value === '') return null;
                  const isPrimary = client.id === primaryClient.id;

                  return (
                    <Label
                      key={`${field.key}-${client.id}`}
                      className="flex items-center gap-3 p-2 rounded border cursor-pointer hover:bg-muted/50"
                    >
                      <RadioGroupItem value={String(value)} />
                      <span className="text-sm flex-1">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {client.first_name} {client.last_name}
                      </span>
                      {isPrimary && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Crown className="w-3 h-3" /> Primary
                        </Badge>
                      )}
                    </Label>
                  );
                })}
              </div>
            </RadioGroup>

            {field.isConsent && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Consent fields require explicit selection. An opt-out should not be overridden without deliberate action.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
