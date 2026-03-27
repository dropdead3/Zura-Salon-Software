/**
 * Shared allergy/sensitivity detection utility for Dock views.
 */

export const ALLERGY_KEYWORDS = [
  'allergy', 'allergic', 'sensitive', 'sensitivity',
  'reaction', 'irritation', 'dermatitis', 'rash',
];

export function detectAllergyFlags(
  medicalAlerts: string | null,
  notes: string | null,
): string | null {
  if (medicalAlerts && medicalAlerts.trim()) return medicalAlerts.trim();
  if (!notes) return null;
  const lower = notes.toLowerCase();
  const hasKeyword = ALLERGY_KEYWORDS.some(kw => lower.includes(kw));
  if (hasKeyword) return notes;
  return null;
}
