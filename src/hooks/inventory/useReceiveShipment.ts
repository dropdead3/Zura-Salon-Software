/**
 * useReceiveShipment — Thin wrapper around PurchasingService.
 * Delegates all receiving logic (PO updates + inventory posting) to the service.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { receiveShipment, type ReceiveShipmentInput } from '@/lib/backroom/services/purchasing-service';

// Re-export types for backward compatibility
export type { ReceivingLineInput, ReceiveShipmentInput } from '@/lib/backroom/services/purchasing-service';

export function useReceiveShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReceiveShipmentInput) => {
      return receiveShipment(input);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-lines'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['receiving-records'] });
      const msg =
        result.receivingStatus === 'complete'
          ? 'Shipment fully received — stock updated'
          : 'Partial shipment received — stock updated';
      toast.success(msg);
    },
    onError: (error) => {
      toast.error('Failed to receive shipment: ' + error.message);
    },
  });
}
