import React from 'react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle, CheckCircle2, ChevronRight, ShieldAlert } from 'lucide-react';
import type { ActionState } from '@/hooks/useActionExecution';
import type { ActionDefinition, InputField, ActionExecutionResult } from '@/lib/actionRegistry';

interface CommandActionPanelProps {
  action: ActionDefinition;
  actionState: ActionState;
  missingInputs: InputField[];
  collectedInputs: Record<string, string>;
  result: ActionExecutionResult | null;
  onProvideInput: (key: string, value: string) => void;
  onSubmitInputs: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CommandActionPanel({
  action,
  actionState,
  missingInputs,
  collectedInputs,
  result,
  onProvideInput,
  onSubmitInputs,
  onConfirm,
  onCancel,
}: CommandActionPanelProps) {
  if (actionState === 'idle') return null;

  return (
    <div className="px-4 py-3 border-t border-border/30">
      {actionState === 'input_needed' && (
        <InputCollectionView
          action={action}
          missingInputs={missingInputs}
          collectedInputs={collectedInputs}
          onProvideInput={onProvideInput}
          onSubmit={onSubmitInputs}
          onCancel={onCancel}
        />
      )}

      {actionState === 'confirming' && (
        <ConfirmationView
          action={action}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}

      {actionState === 'executing' && (
        <ExecutingView action={action} />
      )}

      {actionState === 'success' && result && (
        <SuccessView result={result} onCancel={onCancel} />
      )}

      {actionState === 'error' && result && (
        <ErrorView result={result} onCancel={onCancel} />
      )}
    </div>
  );
}

// ─── Sub-views ───────────────────────────────────────────────

function InputCollectionView({
  action,
  missingInputs,
  collectedInputs,
  onProvideInput,
  onSubmit,
  onCancel,
}: {
  action: ActionDefinition;
  missingInputs: InputField[];
  collectedInputs: Record<string, string>;
  onProvideInput: (key: string, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={cn(tokens.label.default, 'text-foreground')}>
          {action.label}
        </span>
        {action.riskLevel !== 'low' && (
          <span className="text-[10px] text-amber-500 font-sans">
            {action.riskLevel === 'high' ? 'Requires confirmation' : 'Review before proceeding'}
          </span>
        )}
      </div>

      <div className="grid gap-2">
        {missingInputs.map(field => (
          <div key={field.key} className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground font-sans w-20 shrink-0">
              {field.label}
            </label>
            <Input
              type={field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
              placeholder={field.label}
              value={collectedInputs[field.key] ?? ''}
              onChange={e => onProvideInput(field.key, e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
              autoFocus={missingInputs.indexOf(field) === 0}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} className="font-sans text-xs">
          Cancel
        </Button>
        <Button size="sm" onClick={onSubmit} className="font-sans text-xs">
          Continue
          <ChevronRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function ConfirmationView({
  action,
  onConfirm,
  onCancel,
}: {
  action: ActionDefinition;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(tokens.label.default, 'text-foreground')}>
            {action.label}
          </p>
          <p className="text-xs text-muted-foreground font-sans mt-0.5">
            {action.confirmationMessage ?? 'This action requires confirmation before proceeding.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} className="font-sans text-xs">
          Cancel
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onConfirm}
          className="font-sans text-xs"
        >
          Confirm & Continue
        </Button>
      </div>
    </div>
  );
}

function ExecutingView({ action }: { action: ActionDefinition }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground font-sans">
        {action.label}…
      </span>
    </div>
  );
}

function SuccessView({
  result,
  onCancel,
}: {
  result: ActionExecutionResult;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span className="text-sm text-foreground font-sans">{result.message}</span>
      </div>

      {result.nextActions && result.nextActions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {result.nextActions.map((na, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="font-sans text-xs h-7"
              onClick={onCancel}
            >
              {na.label}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorView({
  result,
  onCancel,
}: {
  result: ActionExecutionResult;
  onCancel: () => void;
}) {
  const isPermission = result.error === 'permission_denied';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isPermission ? (
          <ShieldAlert className="w-4 h-4 text-destructive" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-destructive" />
        )}
        <span className="text-sm text-destructive font-sans">{result.message}</span>
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} className="font-sans text-xs">
          Dismiss
        </Button>
      </div>
    </div>
  );
}
