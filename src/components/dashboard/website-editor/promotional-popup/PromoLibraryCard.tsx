/**
 * Promo Library card — picker for curated presets + saved promo snapshots.
 *
 * Renders at the top of `PromotionalPopupEditor` so operators discover
 * "start from a template" before they hand-author copy. Two stacked rows:
 *
 *   1. Presets — read-only catalog from `promo-presets.ts`.
 *   2. Saved promos — operator's own snapshots, persisted via
 *      `usePromoLibrary` into the `promotional_popup_library` site_settings
 *      row.
 *
 * Apply behavior:
 *   - Preset apply  → merges content/offer fields into formData (preserves
 *     enabled/appearance/targeting/schedule). Toast tells the operator to
 *     review and Save.
 *   - Saved apply   → restores the full snapshot config (everything except
 *     `enabled`, which never round-trips so a reload can't auto-publish).
 *   - When `isDirty` is true, both apply paths route through a confirm
 *     dialog so the operator can cancel instead of silently losing edits.
 *
 * Save-current behavior:
 *   - Snapshots `formData` minus `enabled`. Stamps `createdAt`/`updatedAt`.
 *   - Cap of 25 snapshots enforced silently in `usePromoLibrary`.
 *
 * Doctrine alignment:
 *   - Site settings persistence: writes go through `writeSiteSettingDraft`
 *     (read-then-update/insert pattern is enforced inside the hook).
 *   - Visibility contract: empty saved-list renders an inline empty hint;
 *     non-empty list always renders so silence stays meaningful.
 *   - Typography: `font-display` (Termina) only for headers; never for body
 *     copy or labels.
 */
import { useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Sparkles,
  Copy,
  Pencil,
  Trash2,
  ArrowRight,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  PROMO_PRESETS,
  applyPresetContent,
  getPromoPreset,
} from '@/lib/promo-presets';
import {
  usePromoLibrary,
  usePromoLibraryActions,
  snapshotConfig,
  SAVED_PROMO_CAP,
  type SavedPromo,
  type PromoLibrary,
} from '@/hooks/usePromoLibrary';
import type { PromotionalPopupSettings } from '@/hooks/usePromotionalPopup';

interface PromoLibraryCardProps {
  formData: PromotionalPopupSettings;
  setFormData: (next: PromotionalPopupSettings) => void;
  isDirty: boolean;
}

type PendingApply =
  | { kind: 'preset'; presetKey: string }
  | { kind: 'saved'; snapshot: SavedPromo }
  | null;

function formatLastUsed(iso?: string): string {
  if (!iso) return 'Never used';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never used';
  return `Last used ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export function PromoLibraryCard({ formData, setFormData, isDirty }: PromoLibraryCardProps) {
  const { data: library } = usePromoLibrary();
  const writeLibrary = usePromoLibraryActions();
  const saved = library?.saved ?? [];

  const [presetKey, setPresetKey] = useState<string>('');
  const [pendingApply, setPendingApply] = useState<PendingApply>(null);
  const [savingNew, setSavingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<SavedPromo | null>(null);

  const sortedSaved = useMemo(
    () => [...saved].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [saved],
  );

  // ── Apply paths ──

  const applyPreset = (key: string) => {
    const preset = getPromoPreset(key);
    if (!preset) return;
    setFormData(applyPresetContent(formData, preset));
    toast.success(`Loaded "${preset.label}" — review and Save to apply.`);
    setPresetKey('');
  };

  const applySaved = async (snap: SavedPromo) => {
    // Restore full config except `enabled` — operator must explicitly flip
    // the toggle. Preserves the current `enabled` so reloading a saved promo
    // never silently goes live.
    const next: PromotionalPopupSettings = {
      ...snap.config,
      enabled: formData.enabled,
    };
    setFormData(next);
    // Stamp lastAppliedAt so the row caption updates.
    const updated: PromoLibrary = {
      saved: saved.map((p) =>
        p.id === snap.id ? { ...p, lastAppliedAt: new Date().toISOString() } : p,
      ),
    };
    try {
      await writeLibrary.mutateAsync(updated);
    } catch {
      // Stamp failure is non-fatal — the apply already succeeded in-memory.
    }
    toast.success(`Loaded "${snap.name}" — review and Save to apply.`);
  };

  // Both apply paths converge here so the dirty-guard logic stays in one
  // place (and any future "warn before overwrite" toast can hook in once).
  const requestApply = (apply: PendingApply) => {
    if (!apply) return;
    if (isDirty) {
      setPendingApply(apply);
      return;
    }
    runApply(apply);
  };

  const runApply = (apply: PendingApply) => {
    if (!apply) return;
    if (apply.kind === 'preset') applyPreset(apply.presetKey);
    else applySaved(apply.snapshot);
    setPendingApply(null);
  };

  // ── Save / rename / duplicate / delete ──

  const handleSaveCurrent = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Give this promotion a name first.');
      return;
    }
    const now = new Date().toISOString();
    const newPromo: SavedPromo = {
      id: crypto.randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
      config: snapshotConfig(formData),
    };
    try {
      await writeLibrary.mutateAsync({ saved: [...saved, newPromo] });
      toast.success(`Saved "${name}" to your library.`);
      setSavingNew(false);
      setNewName('');
    } catch {
      toast.error('Could not save promotion. Try again.');
    }
  };

  const handleDuplicate = async (snap: SavedPromo) => {
    const now = new Date().toISOString();
    const copy: SavedPromo = {
      ...snap,
      id: crypto.randomUUID(),
      name: `${snap.name} (copy)`,
      createdAt: now,
      updatedAt: now,
      lastAppliedAt: undefined,
    };
    try {
      await writeLibrary.mutateAsync({ saved: [...saved, copy] });
      toast.success(`Duplicated "${snap.name}".`);
    } catch {
      toast.error('Could not duplicate. Try again.');
    }
  };

  const handleRename = async (snap: SavedPromo) => {
    const next = renameValue.trim();
    if (!next) {
      toast.error('Name cannot be empty.');
      return;
    }
    const updated: PromoLibrary = {
      saved: saved.map((p) =>
        p.id === snap.id ? { ...p, name: next, updatedAt: new Date().toISOString() } : p,
      ),
    };
    try {
      await writeLibrary.mutateAsync(updated);
      setRenamingId(null);
      setRenameValue('');
    } catch {
      toast.error('Could not rename. Try again.');
    }
  };

  const handleDelete = async (snap: SavedPromo) => {
    try {
      await writeLibrary.mutateAsync({ saved: saved.filter((p) => p.id !== snap.id) });
      toast.success(`Deleted "${snap.name}".`);
      setDeleteCandidate(null);
    } catch {
      toast.error('Could not delete. Try again.');
    }
  };

  // ── Render ──

  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display uppercase tracking-wider text-xs text-foreground flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Promotion Library
          </h3>
          <p className="font-sans text-xs text-muted-foreground mt-1">
            Start from a curated template, or reload one of your saved promotions.
          </p>
        </div>
      </div>

      {/* ── Preset picker ── */}
      <div className="space-y-1.5">
        <Label className="font-sans text-sm">Start from a template</Label>
        <div className="flex gap-2">
          <Select value={presetKey} onValueChange={setPresetKey}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Choose a preset…" />
            </SelectTrigger>
            <SelectContent>
              {PROMO_PRESETS.map((preset) => (
                <SelectItem key={preset.key} value={preset.key}>
                  <div className="flex flex-col items-start gap-0.5 py-0.5">
                    <span className="font-sans text-sm">{preset.label}</span>
                    <span className="font-sans text-[11px] text-muted-foreground">
                      {preset.rationale}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!presetKey}
            onClick={() => requestApply({ kind: 'preset', presetKey })}
            className="gap-1.5 shrink-0"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Load
          </Button>
        </div>
        <p className="font-sans text-xs text-muted-foreground">
          Templates only fill in copy + offer code. Your appearance, targeting, and schedule are preserved.
        </p>
      </div>

      {/* ── Saved promotions ── */}
      <div className="space-y-2 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between gap-2">
          <Label className="font-sans text-sm">
            Your saved promotions{' '}
            <span className="text-muted-foreground tabular-nums">
              ({saved.length} / {SAVED_PROMO_CAP})
            </span>
          </Label>
          {!savingNew && saved.length < SAVED_PROMO_CAP && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSavingNew(true)}
              className="gap-1.5"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              Save current
            </Button>
          )}
        </div>

        {/* New-snapshot inline form */}
        {savingNew && (
          <div className="flex gap-2 p-2 rounded-lg border border-border bg-background">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Spring Color Promo"
              maxLength={60}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCurrent();
                if (e.key === 'Escape') {
                  setSavingNew(false);
                  setNewName('');
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSaveCurrent}
              disabled={writeLibrary.isPending || !newName.trim()}
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setSavingNew(false);
                setNewName('');
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Saved list / empty state */}
        {sortedSaved.length === 0 ? (
          <p className="font-sans text-xs text-muted-foreground italic px-1 py-2">
            No saved promotions yet — when you find an offer that works, save it here so you can run it again.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {sortedSaved.map((snap) => (
              <li
                key={snap.id}
                className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background"
              >
                {renamingId === snap.id ? (
                  <>
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      maxLength={60}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(snap);
                        if (e.key === 'Escape') {
                          setRenamingId(null);
                          setRenameValue('');
                        }
                      }}
                      className="flex-1 h-8"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRename(snap)}
                      className="h-8 w-8 p-0"
                      aria-label="Confirm rename"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRenamingId(null);
                        setRenameValue('');
                      }}
                      className="h-8 w-8 p-0"
                      aria-label="Cancel rename"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-sm text-foreground truncate" title={snap.name}>
                        {snap.name}
                      </p>
                      <p className="font-sans text-[11px] text-muted-foreground truncate">
                        {formatLastUsed(snap.lastAppliedAt)}
                        {snap.config.headline && (
                          <>
                            {' · '}
                            <span className="italic">{snap.config.headline}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => requestApply({ kind: 'saved', snapshot: snap })}
                        className="h-8 px-2 gap-1.5"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Apply
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRenamingId(snap.id);
                          setRenameValue(snap.name);
                        }}
                        className="h-8 w-8 p-0"
                        aria-label={`Rename ${snap.name}`}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDuplicate(snap)}
                        className="h-8 w-8 p-0"
                        aria-label={`Duplicate ${snap.name}`}
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteCandidate(snap)}
                        className={cn('h-8 w-8 p-0 text-muted-foreground hover:text-destructive')}
                        aria-label={`Delete ${snap.name}`}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Dirty-form apply confirm ── */}
      <AlertDialog
        open={pendingApply !== null}
        onOpenChange={(next) => {
          if (!next) setPendingApply(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your unsaved edits?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the popup editor. Loading this promotion will overwrite them. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingApply(null)}>
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => runApply(pendingApply)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard & load
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete confirm ── */}
      <AlertDialog
        open={deleteCandidate !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteCandidate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this promotion?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteCandidate?.name}" will be removed from your saved promotions. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCandidate && handleDelete(deleteCandidate)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
