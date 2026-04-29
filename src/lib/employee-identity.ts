/**
 * Canonical helpers for rendering a team member's identity in HR / archive
 * surfaces. Centralized so that the day a payroll integration starts writing
 * `employee_profiles.employee_number`, every surface flips to the real number
 * automatically — no per-component edits required.
 */

export interface EmployeeIdInput {
  employeeNumber?: string | null;
  userId?: string | null;
}

/**
 * Returns the most authoritative human-readable employee identifier:
 *   1. The HR-issued `employee_number` if populated.
 *   2. Fallback: last 8 chars of the user UUID, uppercased.
 *
 * Returns `null` when neither is available (extreme edge case — shouldn't
 * happen in practice, but defensive).
 */
export function formatEmployeeId(opts: EmployeeIdInput): string | null {
  const trimmed = opts.employeeNumber?.trim();
  if (trimmed) return trimmed;
  if (opts.userId) return opts.userId.slice(-8).toUpperCase();
  return null;
}

/**
 * "Hired Mar 2023" — concise HR-friendly hire date.
 * Returns null when the date is missing or invalid (silence is valid output).
 */
export function formatHireDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Hired ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}
