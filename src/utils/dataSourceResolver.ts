/**
 * Data source resolution constants.
 * 
 * All report hooks use union views that merge Phorest-synced data with Zura-native data.
 * This ensures reports work regardless of whether Phorest is connected.
 * 
 * View mapping:
 *  - v_all_appointments = phorest_appointments UNION appointments
 *  - v_all_clients = phorest_clients UNION clients (excluding placeholders and Phorest-linked)
 *  - v_all_transaction_items = phorest_transaction_items UNION transaction_items (pre-existing)
 * 
 * Column normalization in views:
 *  - phorest_client_id: preserved as-is in appointment/client views
 *  - stylist_user_id: maps to staff_user_id from appointments table
 *  - staff_name: available in v_all_appointments (NULL for Phorest side)
 *  - external_client_id: maps phorest_client_id in v_all_transaction_items
 *  - staff_name: maps stylist_name in v_all_transaction_items
 */

export const DATA_VIEWS = {
  appointments: 'v_all_appointments',
  clients: 'v_all_clients',
  transactionItems: 'v_all_transaction_items',
} as const;

export type DataView = typeof DATA_VIEWS[keyof typeof DATA_VIEWS];
