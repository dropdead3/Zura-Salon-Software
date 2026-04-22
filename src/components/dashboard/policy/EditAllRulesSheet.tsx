/**
 * EditAllRulesSheet (Wave 28.15)
 *
 * Fallback disclosure for schema fields not present as inline chips in the
 * prose (or for power users who want the whole form at once). Reuses the
 * existing `PolicyRuleField` so validation / control rendering / provenance
 * lines all behave identically to the legacy Expert view.
 *
 * Mounted in a luxury floating panel — same visual canon as Version history
 * and Acknowledgments drawers.
 */
import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { PolicyRuleField } from './PolicyRuleField';
import type {
  ConfiguratorSchema,
  RuleField,
} from '@/lib/policy/configurator-schemas';
import type { PolicyAudience } from '@/hooks/policy/usePolicyData';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: ConfiguratorSchema;
  values: Record<string, unknown>;
  audience: PolicyAudience;
  saving: boolean;
  /** Persist all rule blocks as a single transaction. */
  onSave: (next: Record<string, unknown>) => void;
  /** Forwarded so longtext field edits flag user-edit sacredness in parent. */
  onFieldEdit?: (field: RuleField, value: unknown) => void;
}

export function EditAllRulesSheet({
  open,
  onOpenChange,
  schema,
  values,
  audience,
  saving,
  onSave,
  onFieldEdit,
}: Props) {
  const [draft, setDraft] = useState<Record<string, unknown>>(values);

  // Re-seed draft each time the sheet opens so it reflects any chip edits
  // the operator made while the sheet was closed.
  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  return (
    <PremiumFloatingPanel open={open} onOpenChange={onOpenChange} maxWidth="720px">
      <div className={tokens.drawer.header}>
        <h2 className={cn(tokens.heading.section)}>Edit all rules</h2>
        <p className="font-sans text-sm text-muted-foreground mt-1">
          The full schema for this policy. Inline chips above and this sheet edit the
          same underlying values — choose whichever is easier for the change you need.
        </p>
      </div>
      <div className={tokens.drawer.body}>
        <div className="space-y-6">
          {schema.sections.map((section) => (
            <div key={section.title} className="space-y-3">
              <div>
                <h3 className="font-display text-xs tracking-wider uppercase text-foreground">
                  {section.title}
                </h3>
                {section.description && (
                  <p className="font-sans text-xs text-muted-foreground mt-1">
                    {section.description}
                  </p>
                )}
              </div>
              <div className="space-y-4 rounded-xl border border-border bg-card/60 p-4">
                {section.fields.map((field) => (
                  <PolicyRuleField
                    key={field.key}
                    field={field}
                    value={draft[field.key]}
                    audience={audience}
                    onChange={(v) => {
                      setDraft((prev) => ({ ...prev, [field.key]: v }));
                      onFieldEdit?.(field, v);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="font-sans"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => onSave(draft)}
              disabled={saving}
              className="font-sans"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save all rules
            </Button>
          </div>
        </div>
      </div>
    </PremiumFloatingPanel>
  );
}
