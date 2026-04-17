/**
 * Reusable inline-edit row for client phone / email — used in
 * AppointmentDetailSheet's Client Contact panel.
 *
 * UX (per Wave 22.35):
 *  - View mode: shows value + hover-pencil affordance; empty-state shows "+ Add"
 *  - Edit mode: inline Input + Save/Cancel; soft-warns on Tier 1 format failure
 *  - Save still proceeds on warning (staff = soft-warn per Wave 22.34 decision)
 *  - Tap targets ≥36px on mobile
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Mail, Pencil, Phone, Plus, X, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  validateEmail,
  validatePhone,
  type ContactValidationResult,
} from '@/lib/contactValidation';

type Field = 'email' | 'phone';

interface InlineContactEditProps {
  field: Field;
  value: string | null | undefined;
  /** Display formatter (e.g., formatPhoneDisplay) — only applied in view mode */
  formatDisplay?: (raw: string) => string;
  /** Save handler. Resolves on success; rejects on failure. */
  onSave: (newValue: string) => Promise<void>;
  /** Optional rendered after value when in view mode (Call/Text/Copy buttons) */
  rightSlot?: React.ReactNode;
  /** When true, hides the empty-state CTA (use when caller renders its own) */
  hideEmptyState?: boolean;
  /** When true, label the trailing chip with this fallback (e.g., "Walk-in") */
  emptyLabel?: string;
  className?: string;
}

const ICONS: Record<Field, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  phone: Phone,
};

const VALIDATORS: Record<Field, (v: string) => ContactValidationResult> = {
  email: validateEmail,
  phone: validatePhone,
};

const PLACEHOLDERS: Record<Field, string> = {
  email: 'name@domain.com',
  phone: '(555) 123-4567',
};

const ADD_LABELS: Record<Field, string> = {
  email: 'Add email',
  phone: 'Add phone',
};

export function InlineContactEdit({
  field,
  value,
  formatDisplay,
  onSave,
  rightSlot,
  hideEmptyState = false,
  emptyLabel,
  className,
}: InlineContactEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [warning, setWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const Icon = ICONS[field];
  const trimmed = (value ?? '').trim();
  const hasValue = trimmed.length > 0;
  const inputType = field === 'email' ? 'email' : 'tel';

  useEffect(() => {
    if (isEditing) {
      setDraft(value ?? '');
      setWarning(null);
      // Focus + select on next paint
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isEditing, value]);

  const handleSave = async () => {
    const next = draft.trim();
    if (next === trimmed) {
      setIsEditing(false);
      return;
    }

    const result = VALIDATORS[field](next);
    // Soft-warn: surface the warning but still save (staff override).
    // Hard-block: empty when previously had a value (treat as "clear" — confirm)
    if (!result.valid && !next) {
      setWarning(result.warning ?? 'Invalid');
      return;
    }
    if (!result.valid) {
      // First click: show warning, second click: proceed
      if (warning !== result.warning) {
        setWarning(result.warning ?? 'Looks unusual — click Save again to confirm');
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave(next);
      setIsEditing(false);
      setWarning(null);
    } catch {
      // Caller surfaces the toast; keep edit mode open for retry
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value ?? '');
    setWarning(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // ─────────── EDIT MODE ───────────
  if (isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        className={cn('space-y-1', className)}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            type={inputType}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (warning) setWarning(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDERS[field]}
            autoCapitalize="none"
            className="h-8 text-sm rounded-md flex-1 min-w-0"
            disabled={isSaving}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleSave}
            disabled={isSaving}
            aria-label="Save"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleCancel}
            disabled={isSaving}
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        {warning && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 pl-6">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>{warning}</span>
            {!isSaving && (
              <span className="text-muted-foreground">· press Save again to keep</span>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  // ─────────── EMPTY STATE ───────────
  if (!hasValue) {
    if (hideEmptyState) return null;
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className={cn(
          'group flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left py-1',
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="flex items-center gap-1">
          <Plus className="h-3 w-3" />
          {ADD_LABELS[field]}
          {emptyLabel && <span className="text-muted-foreground/70 ml-1">· {emptyLabel}</span>}
        </span>
      </button>
    );
  }

  // ─────────── VIEW MODE ───────────
  return (
    <div className={cn('group flex flex-wrap items-center justify-between gap-2', className)}>
      <div className="flex items-center gap-2 text-sm min-w-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate">{formatDisplay ? formatDisplay(trimmed) : trimmed}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          onClick={() => setIsEditing(true)}
          aria-label={`Edit ${field}`}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
      {rightSlot && <div className="flex items-center gap-1.5">{rightSlot}</div>}
    </div>
  );
}
