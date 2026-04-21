/**
 * PolicyQuestionnaire (Wave 28.14)
 *
 * One-question-at-a-time interview that replaces the section-grouped form on
 * the "Define rules" step. The operator sees a plain-English question, three
 * to four anchored presets (one marked as the industry standard), and a
 * Back / Skip / Next rhythm. The full input still renders below the presets
 * so custom values remain possible — presets are an anchor, not a cage.
 *
 * Doctrine alignment:
 *  - Recommended presets reduce decision fatigue without removing operator control.
 *  - Skip is a first-class action — non-required fields fall back to defaultValue.
 *  - Back never destroys an answer — values are owned by the parent (sacred).
 *  - Fields without a `question` declaration fall back to today's behavior.
 */
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { PolicyRuleField } from './PolicyRuleField';
import type {
  ConfiguratorSchema,
  RuleField,
  RuleSection,
} from '@/lib/policy/configurator-schemas';
import type { PolicyAudience } from '@/lib/policy/build-provenance-line';

interface QuestionEntry {
  field: RuleField;
  section: RuleSection;
  sectionIndex: number;
  totalSections: number;
}

interface PolicyQuestionnaireProps {
  schema: ConfiguratorSchema;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown, fieldType: RuleField['type']) => void;
  onComplete: () => void;
  saving?: boolean;
  audience: PolicyAudience;
  ctaLabel: string;
}

function isAnswered(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

export function PolicyQuestionnaire({
  schema,
  values,
  onChange,
  onComplete,
  saving = false,
  audience,
  ctaLabel,
}: PolicyQuestionnaireProps) {
  // Flatten the schema into an ordered question list, preserving section context
  // so the chip above each question can read "Section 2 of 3 — Fee".
  const questions = useMemo<QuestionEntry[]>(() => {
    const totalSections = schema.sections.length;
    const flat: QuestionEntry[] = [];
    schema.sections.forEach((section, sectionIndex) => {
      section.fields.forEach((field) => {
        flat.push({ field, section, sectionIndex, totalSections });
      });
    });
    return flat;
  }, [schema]);

  // Open at the first unanswered question. Reopens at first unanswered when
  // the schema changes (e.g., switching policies in the same panel session).
  const initialIndex = useMemo(() => {
    const idx = questions.findIndex((q) => !isAnswered(values[q.field.key]));
    return idx === -1 ? 0 : idx;
  }, [questions]); // eslint-disable-line react-hooks/exhaustive-deps

  const [index, setIndex] = useState(initialIndex);
  const safeIndex = Math.min(Math.max(0, index), questions.length - 1);
  const current = questions[safeIndex];

  useEffect(() => {
    // If the operator removed all questions (shouldn't happen) or schema flipped,
    // clamp.
    if (index >= questions.length) setIndex(Math.max(0, questions.length - 1));
  }, [questions.length, index]);

  if (!current) return null;

  const { field, section, sectionIndex, totalSections } = current;
  const value = values[field.key];
  const answered = isAnswered(value);
  const isLast = safeIndex === questions.length - 1;
  const question = field.question || field.label;
  const why = field.whyItMatters || field.helper;

  const handlePresetClick = (presetValue: unknown) => {
    onChange(field.key, presetValue, field.type);
  };

  const handleNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setIndex(safeIndex + 1);
  };

  const handleSkip = () => {
    // Skip without overwriting — if defaultValue exists and the field isn't
    // answered, seed it now so the live preview reflects the assumed default.
    if (!answered && field.defaultValue !== undefined) {
      onChange(field.key, field.defaultValue, field.type);
    }
    if (isLast) {
      onComplete();
      return;
    }
    setIndex(safeIndex + 1);
  };

  const handleBack = () => {
    if (safeIndex > 0) setIndex(safeIndex - 1);
  };

  return (
    <div className="space-y-6">
      {/* Progress chip strip — moved to TOP (Wave 28.14.1) so orientation lands
          where the eye starts, not under the navigation row. */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {questions.map((q, i) => {
          const a = isAnswered(values[q.field.key]);
          const active = i === safeIndex;
          const reachable = a || i <= safeIndex;
          return (
            <button
              key={q.field.key}
              type="button"
              onClick={() => reachable && setIndex(i)}
              disabled={!reachable}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[10px] transition-colors',
                active
                  ? 'bg-primary/10 text-foreground border border-primary/40'
                  : a
                    ? 'bg-muted text-foreground hover:bg-muted/80 border border-transparent'
                    : 'bg-transparent text-muted-foreground/40 border border-transparent cursor-not-allowed',
              )}
              title={q.field.label}
            >
              <span className="text-[8px]">{a ? '✓' : active ? '⏵' : '○'}</span>
              <span className="max-w-[120px] truncate">
                {q.field.question || q.field.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section + question position */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-display text-[10px] tracking-wider uppercase text-muted-foreground">
          Section {sectionIndex + 1} of {totalSections} · {section.title}
        </span>
        <span className="font-sans text-[10px] text-muted-foreground/60">·</span>
        <span className="font-sans text-[10px] text-muted-foreground">
          Question {safeIndex + 1} of {questions.length}
        </span>
      </div>

      {/* The plain-English question */}
      <div className="space-y-2">
        <h4 className="font-display text-xl tracking-wide text-foreground">
          {question}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </h4>
        {why && (
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="font-sans text-xs text-muted-foreground">
                <span className="text-foreground">Why this matters: </span>
                {why}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Anchored presets (when declared) */}
      {field.presets && field.presets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {field.presets.map((preset) => {
            const selected =
              JSON.stringify(value) === JSON.stringify(preset.value);
            return (
              <button
                key={String(preset.value)}
                type="button"
                onClick={() => handlePresetClick(preset.value)}
                className={cn(
                  'group relative rounded-xl border p-4 text-left transition-all',
                  'hover:border-foreground/30 hover:bg-muted/40',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border bg-card',
                )}
              >
                {selected && (
                  <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                )}
                {preset.recommended && (
                  <span className="inline-flex items-center gap-1 mb-1.5 font-display text-[9px] tracking-wider uppercase text-primary">
                    ★ Recommended
                  </span>
                )}
                <div className="font-display text-sm tracking-wide text-foreground">
                  {preset.label}
                </div>
                {preset.sublabel && (
                  <div className="font-sans text-xs text-muted-foreground mt-0.5">
                    {preset.sublabel}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Underlying input — always present so custom values remain possible.
          For preset-driven fields we render it under a "Custom" disclosure so
          the presets stay the primary affordance. */}
      <div className={cn(field.presets && field.presets.length > 0 && 'pt-1')}>
        {field.presets && field.presets.length > 0 ? (
          <details className="group">
            <summary className="font-sans text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors list-none flex items-center gap-1">
              <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
              Set a custom value
            </summary>
            <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <PolicyRuleField
                field={field}
                value={value}
                onChange={(v) => onChange(field.key, v, field.type)}
                audience={audience}
                helperPlacement="inline"
              />
            </div>
          </details>
        ) : (
          <PolicyRuleField
            field={field}
            value={value}
            onChange={(v) => onChange(field.key, v, field.type)}
            audience={audience}
            helperPlacement="inline"
          />
        )}
      </div>

      {/* Navigation row — single row, no progress chips below (those are at top now) */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          disabled={safeIndex === 0}
          className="font-sans text-muted-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {!field.required && !isLast && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="font-sans text-muted-foreground"
            >
              Skip for now
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleNext}
            disabled={saving || (field.required && !answered)}
            className="font-sans"
          >
            {isLast ? ctaLabel : 'Next'}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
