import { useState } from 'react';
import { Plus, X, Pencil, Heart } from 'lucide-react';
import {
  useClientAboutFacts,
  useUpsertAboutFact,
  useDeleteAboutFact,
  ABOUT_CATEGORY_LABELS,
  ABOUT_CATEGORY_ORDER,
  type AboutCategory,
  type ClientAboutFact,
} from '@/hooks/useClientAboutFacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ClientAboutCardProps {
  organizationId: string | null | undefined;
  clientId: string | null | undefined;
  clientFirstName?: string | null;
  /** Compact mode = no border/padding wrapper (for use inside other cards). */
  compact?: boolean;
}

export function ClientAboutCard({
  organizationId,
  clientId,
  clientFirstName,
  compact = false,
}: ClientAboutCardProps) {
  const { data: facts = [], isLoading } = useClientAboutFacts(clientId);
  const upsert = useUpsertAboutFact();
  const remove = useDeleteAboutFact();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftCategory, setDraftCategory] = useState<AboutCategory>('family');
  const [draftLabel, setDraftLabel] = useState('');
  const [draftValue, setDraftValue] = useState('');

  if (!clientId || !organizationId) return null;

  const resetDraft = () => {
    setAdding(false);
    setEditingId(null);
    setDraftCategory('family');
    setDraftLabel('');
    setDraftValue('');
  };

  const handleSave = async () => {
    if (!draftValue.trim()) return;
    await upsert.mutateAsync({
      id: editingId ?? undefined,
      organization_id: organizationId,
      client_id: clientId,
      category: draftCategory,
      label: draftCategory === 'custom' ? draftLabel.trim() || null : null,
      value: draftValue.trim(),
    });
    resetDraft();
  };

  const startEdit = (fact: ClientAboutFact) => {
    setEditingId(fact.id);
    setAdding(true);
    setDraftCategory(fact.category);
    setDraftLabel(fact.label ?? '');
    setDraftValue(fact.value);
  };

  // Sort facts by canonical category order
  const sortedFacts = [...facts].sort(
    (a, b) =>
      ABOUT_CATEGORY_ORDER.indexOf(a.category) - ABOUT_CATEGORY_ORDER.indexOf(b.category),
  );

  const wrapperCls = compact
    ? 'space-y-2'
    : 'rounded-xl border bg-card p-4 space-y-3';

  return (
    <div className={wrapperCls}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary" />
          <h3 className="font-display text-xs tracking-wide uppercase">
            About {clientFirstName || 'Client'}
          </h3>
        </div>
        {!adding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdding(true)}
            className="h-7 px-2 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : sortedFacts.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground italic leading-relaxed">
          Capture the personal details that make {clientFirstName || 'this client'} feel
          known — kids' names, pets, hobbies, what they're working on. We'll surface them
          next visit.
        </p>
      ) : (
        <dl className="space-y-1.5">
          {sortedFacts.map((fact) => (
            <div
              key={fact.id}
              className="grid grid-cols-[110px_1fr_auto] gap-2 items-start text-sm group"
            >
              <dt className="text-xs text-muted-foreground pt-0.5">
                {fact.category === 'custom'
                  ? fact.label || 'Note'
                  : ABOUT_CATEGORY_LABELS[fact.category]}
              </dt>
              <dd className="text-foreground">{fact.value}</dd>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(fact)}
                  className="p-1 hover:bg-muted rounded"
                  aria-label="Edit"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => remove.mutate({ id: fact.id, client_id: clientId })}
                  className="p-1 hover:bg-muted rounded"
                  aria-label="Delete"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </dl>
      )}

      {adding && (
        <div className="space-y-2 pt-2 border-t">
          <div className={cn('grid gap-2', draftCategory === 'custom' ? 'grid-cols-2' : 'grid-cols-1')}>
            <Select
              value={draftCategory}
              onValueChange={(v) => setDraftCategory(v as AboutCategory)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ABOUT_CATEGORY_ORDER.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {ABOUT_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {draftCategory === 'custom' && (
              <Input
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="Label (e.g. Coffee order)"
                className="h-8 text-xs"
                autoCapitalize="off"
              />
            )}
          </div>
          <Input
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            placeholder="Value (e.g. Wife Sarah · Kids Max (8), Lila (5))"
            className="h-8 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') resetDraft();
            }}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={resetDraft} className="h-7 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!draftValue.trim() || upsert.isPending}
              className="h-7 text-xs"
            >
              {editingId ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
