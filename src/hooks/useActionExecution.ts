/**
 * Zura Search Action Execution Hook
 * Orchestrates: detect → validate → input → confirm → execute → feedback
 * No business logic — delegates to existing routes/hooks.
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import type { ParsedQuery } from '@/lib/queryParser';
import {
  getAction,
  extractInputsFromTarget,
  validateInputs,
  requiresConfirmation,
  checkPermissions,
  buildRoute,
  getNextActions,
  type ActionDefinition,
  type InputField,
  type ActionExecutionResult,
} from '@/lib/actionRegistry';

// ─── Types ───────────────────────────────────────────────────

export type ActionState =
  | 'idle'
  | 'input_needed'
  | 'confirming'
  | 'executing'
  | 'success'
  | 'error';

export interface ActionExecutionState {
  activeAction: ActionDefinition | null;
  actionState: ActionState;
  missingInputs: InputField[];
  collectedInputs: Record<string, string>;
  result: ActionExecutionResult | null;
}

export interface UseActionExecutionReturn extends ActionExecutionState {
  detectAndPrepare: (parsedQuery: ParsedQuery, permissions: string[]) => void;
  provideInput: (key: string, value: string) => void;
  submitInputs: () => void;
  confirm: () => void;
  cancel: () => void;
  reset: () => void;
}

// ─── Hook ────────────────────────────────────────────────────

const INITIAL_STATE: ActionExecutionState = {
  activeAction: null,
  actionState: 'idle',
  missingInputs: [],
  collectedInputs: {},
  result: null,
};

export function useActionExecution(): UseActionExecutionReturn {
  const [state, setState] = useState<ActionExecutionState>(INITIAL_STATE);
  const navigate = useNavigate();

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const executeAction = useCallback((action: ActionDefinition, inputs: Record<string, string>) => {
    setState(prev => ({ ...prev, actionState: 'executing' }));

    try {
      const route = buildRoute(action, inputs);
      const nextActions = getNextActions(action.id);

      setState(prev => ({
        ...prev,
        actionState: 'success',
        result: {
          success: true,
          message: `Opening ${action.label.toLowerCase()}`,
          navigateTo: route,
          nextActions,
        },
      }));

      // Navigate after brief feedback visibility
      setTimeout(() => {
        navigate(route);
      }, 600);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action failed unexpectedly';
      setState(prev => ({
        ...prev,
        actionState: 'error',
        result: {
          success: false,
          message: errorMessage,
          error: errorMessage,
        },
      }));

      toast({
        title: 'Action failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [navigate]);

  const detectAndPrepare = useCallback((parsedQuery: ParsedQuery, permissions: string[]) => {
    const { actionIntent } = parsedQuery;

    // No action intent or below threshold
    if (!actionIntent) {
      reset();
      return;
    }

    const action = getAction(actionIntent.type);
    if (!action) {
      reset();
      return;
    }

    // Confidence gating
    if (actionIntent.confidence < action.confidenceThreshold) {
      reset();
      return;
    }

    // Permission check — fail visibly, never silently
    if (!checkPermissions(action, permissions)) {
      setState({
        activeAction: action,
        actionState: 'error',
        missingInputs: [],
        collectedInputs: {},
        result: {
          success: false,
          message: 'You don\'t have permission to perform this action.',
          error: 'permission_denied',
        },
      });
      return;
    }

    // Extract inputs from target token
    const extracted = extractInputsFromTarget(action, actionIntent.target);
    const validation = validateInputs(action, extracted);

    if (!validation.valid) {
      // Combine required missing + all optional fields for input collection
      const allMissing = [
        ...validation.missing,
        ...action.optionalInputs,
      ];

      setState({
        activeAction: action,
        actionState: 'input_needed',
        missingInputs: allMissing,
        collectedInputs: extracted,
        result: null,
      });
      return;
    }

    // All required inputs present
    if (requiresConfirmation(action)) {
      setState({
        activeAction: action,
        actionState: 'confirming',
        missingInputs: [],
        collectedInputs: validation.collected,
        result: null,
      });
      return;
    }

    // Low/medium risk with all inputs — execute immediately
    executeAction(action, validation.collected);
    setState(prev => ({
      ...prev,
      activeAction: action,
      collectedInputs: validation.collected,
    }));
  }, [reset, executeAction]);

  const provideInput = useCallback((key: string, value: string) => {
    setState(prev => ({
      ...prev,
      collectedInputs: { ...prev.collectedInputs, [key]: value },
    }));
  }, []);

  const submitInputs = useCallback(() => {
    const { activeAction, collectedInputs } = state;
    if (!activeAction) return;

    const validation = validateInputs(activeAction, collectedInputs);
    if (!validation.valid) {
      // Update missing inputs display
      setState(prev => ({
        ...prev,
        missingInputs: validation.missing,
      }));
      return;
    }

    if (requiresConfirmation(activeAction)) {
      setState(prev => ({
        ...prev,
        actionState: 'confirming',
        missingInputs: [],
      }));
    } else {
      executeAction(activeAction, collectedInputs);
    }
  }, [state, executeAction]);

  const confirm = useCallback(() => {
    const { activeAction, collectedInputs } = state;
    if (!activeAction) return;
    executeAction(activeAction, collectedInputs);
  }, [state, executeAction]);

  const cancel = useCallback(() => {
    reset();
  }, [reset]);

  return {
    ...state,
    detectAndPrepare,
    provideInput,
    submitInputs,
    confirm,
    cancel,
    reset,
  };
}
