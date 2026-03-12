/**
 * useDepleteMixSession — Thin wrapper around InventoryLedgerService.
 * On session completion, delegates batch stock depletion to the service.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { postUsageFromSession } from '@/lib/backroom/services/inventory-ledger-service';

interface DepletionParams {
  sessionId: string;
  organizationId: string;
  locationId?: string;
}

export function useDepleteMixSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, organizationId, locationId }: DepletionParams) => {
      return postUsageFromSession({ sessionId, organizationId, locationId });
    },
    onSuccess: (result) => {
      if (result.movementsInserted > 0) {
        queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
      }
    },
    onError: (error) => {
      console.error('Inventory depletion failed:', error);
      toast.error('Failed to deplete inventory — stock not updated');
    },
  });
}
