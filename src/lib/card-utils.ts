/**
 * Shared card expiration utility.
 * Used across PaymentMethodsCard, AppointmentDetailSheet, DockScheduleTab.
 */

export function isCardExpired(expMonth: number | null | undefined, expYear: number | null | undefined): boolean {
  if (!expMonth || !expYear) return false;
  const now = new Date();
  const fullYear = expYear < 100 ? 2000 + expYear : expYear;
  // Card expires at the end of the expiration month
  const expDate = new Date(fullYear, expMonth, 0); // last day of exp month
  return now > expDate;
}
