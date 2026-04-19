/**
 * Policy Configurator panel (Wave 28.4)
 *
 * Schema-driven decision tree editor. One panel handles all 47 policies via
 * the configurator_schema_key on each library entry. Adopts the policy if
 * it hasn't been adopted yet, then loads existing rule blocks for editing.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { tokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { PolicyRuleField } from './PolicyRuleField';
import {
  getConfiguratorSchema,
  type RuleField,
} from '@/lib/policy/configurator-schemas';
import {
  useAdoptAndInitPolicy,
  usePolicyConfiguratorData,
  useSavePolicyRuleBlocks,
} from '@/hooks/policy/usePolicyConfigurator';
import type { PolicyLibraryEntry } from '@/hooks/policy/usePolicyData';
import { POLICY_CATEGORY_META } from '@/hooks/policy/usePolicyData';

interface PolicyConfiguratorPanelProps {
  entry: PolicyLibraryEntry & { configurator_schema_key?: string | null };
  alreadyAdopted: boolean;
  onClose: () => void;
}

function defaultsFromSchema(fields: RuleField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  fields.forEach((f) => {
    if (f.defaultValue !== undefined) out[f.key] = f.defaultValue;
  });
  return out;
}

export function PolicyConfiguratorPanel({
  entry,
  alreadyAdopted,
  onClose,
}: PolicyConfiguratorPanelProps) {
  const schema = getConfiguratorSchema(entry.configurator_schema_key);
  const adopt = useAdoptAndInitPolicy();
  const { data, isLoading, refetch } = usePolicyConfiguratorData(entry.key);
  const save = useSavePolicyRuleBlocks();

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [hydrated, setHydrated] = useState(false);

  // Auto-adopt if not yet adopted, so the configurator always has a draft version.
  useEffect(() => {
    if (!alreadyAdopted && !adopt.isPending && !adopt.isSuccess) {
      adopt.mutate(entry.key, { onSuccess: () => refetch() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyAdopted, entry.key]);

  const allFields = useMemo(() => schema.sections.flatMap((s) => s.fields), [schema]);

  // Hydrate values once data arrives.
  useEffect(() => {
    if (!data || hydrated) return;
    const fromBlocks: Record<string, unknown> = {};
    data.blocks.forEach((b) => {
      // value column stores a jsonb; wrapper object { v: ... } or direct
      const v = b.value as { v?: unknown } | unknown;
      fromBlocks[b.block_key] = v && typeof v === 'object' && 'v' in (v as object)
        ? (v as { v: unknown }).v
        : v;
    });
    const seeded = { ...defaultsFromSchema(allFields), ...fromBlocks };
    setValues(seeded);
    setHydrated(true);
  }, [data, hydrated, allFields]);

  const versionId = data?.versionId;
  const versionNumber = data?.versionNumber ?? 1;
  const ready = !isLoading && !!versionId && hydrated;

  const handleSave = () => {
    if (!versionId) return;
    const blocks = allFields
      .map((f) => ({
        block_key: f.key,
        rule_type: f.type,
        value: { v: values[f.key] ?? null },
        required: !!f.required,
      }))
      .filter((b) => b.value.v !== null && b.value.v !== '');
    save.mutate({ versionId, blocks }, { onSuccess: onClose });
  };

  const categoryMeta = POLICY_CATEGORY_META[entry.category];

  return (
    <div className="space-y-6">
      {/* Header context */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-sans text-xs">
            {categoryMeta.label}
          </Badge>
          <Badge variant="secondary" className="font-sans text-xs">
            {entry.audience === 'both' ? 'Internal + Client-facing' : entry.audience === 'external' ? 'Client-facing' : 'Internal'}
          </Badge>
          {ready && (
            <Badge variant="outline" className="font-sans text-xs">
              v{versionNumber} · draft
            </Badge>
          )}
        </div>
        <div>
          <h3 className={cn(tokens.heading.section, 'mb-1')}>{entry.title}</h3>
          <p className="font-sans text-sm text-muted-foreground">
            {entry.short_description}
          </p>
        </div>
        {entry.why_it_matters && (
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="font-sans text-xs text-muted-foreground">
                <span className="text-foreground font-medium">Why this matters:</span>{' '}
                {entry.why_it_matters}
              </p>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Schema description */}
      <div>
        <h4 className="font-sans text-sm font-medium mb-1">{schema.label}</h4>
        <p className="font-sans text-xs text-muted-foreground">{schema.description}</p>
      </div>

      {/* Form */}
      {!ready ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className={tokens.loading.spinner} />
        </div>
      ) : (
        <div className="space-y-6">
          {schema.sections.map((section) => (
            <div key={section.title} className="space-y-4">
              <div>
                <h5 className="font-display text-xs tracking-wider uppercase text-foreground">
                  {section.title}
                </h5>
                {section.description && (
                  <p className="font-sans text-xs text-muted-foreground mt-1">{section.description}</p>
                )}
              </div>
              <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                {section.fields.map((field) => (
                  <PolicyRuleField
                    key={field.key}
                    field={field}
                    value={values[field.key]}
                    onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <Separator />
      <div className="flex items-center justify-between gap-3">
        <p className="font-sans text-xs text-muted-foreground">
          Saving creates a draft. AI drafting and surface wiring come next.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="font-sans">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!ready || save.isPending}
            className="font-sans"
          >
            {save.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save rules
          </Button>
        </div>
      </div>
    </div>
  );
}
