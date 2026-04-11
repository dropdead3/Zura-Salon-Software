/**
 * Historical Effectiveness Tracker.
 * Tunes Opportunity and Ease weighting based on historical task completion data.
 * Final task generation and prioritization remain deterministic.
 */

import type { ImpactMetrics, MeasurementWindow } from './seo-impact-tracker';

export interface EffectivenessRecord {
  templateKey: string;
  objectType: string;
  completionRate: number;         // 0–1
  avgCompletionDays: number;
  avgImpact30d: number;           // normalized 0–1
  sampleSize: number;
}

/**
 * Compute effectiveness-adjusted weight modifiers.
 * These modifiers tune the Opportunity and Ease factors in the priority model.
 * They DO NOT change the priority formula — they adjust input values.
 */
export function computeEffectivenessModifiers(records: EffectivenessRecord[]): Record<string, {
  opportunityModifier: number;
  easeModifier: number;
}> {
  const modifiers: Record<string, { opportunityModifier: number; easeModifier: number }> = {};

  for (const record of records) {
    // Need minimum sample size for statistical relevance
    if (record.sampleSize < 5) {
      modifiers[record.templateKey] = { opportunityModifier: 1.0, easeModifier: 1.0 };
      continue;
    }

    // Opportunity modifier: based on average 30-day impact
    // High-impact templates get boosted, low-impact get dampened
    let opportunityModifier = 1.0;
    if (record.avgImpact30d >= 0.7) {
      opportunityModifier = 1.3; // High performer
    } else if (record.avgImpact30d >= 0.4) {
      opportunityModifier = 1.0; // Normal
    } else if (record.avgImpact30d >= 0.1) {
      opportunityModifier = 0.8; // Low performer
    } else {
      opportunityModifier = 0.6; // Minimal impact historically
    }

    // Ease modifier: based on completion rate and avg days
    let easeModifier = 1.0;
    if (record.completionRate >= 0.9 && record.avgCompletionDays <= 3) {
      easeModifier = 1.2; // Easy to complete
    } else if (record.completionRate >= 0.7) {
      easeModifier = 1.0; // Normal
    } else if (record.completionRate >= 0.4) {
      easeModifier = 0.8; // Hard to complete
    } else {
      easeModifier = 0.6; // Rarely completed — deprioritize ease
    }

    modifiers[record.templateKey] = { opportunityModifier, easeModifier };
  }

  return modifiers;
}

/**
 * Aggregate raw impact data into effectiveness records.
 */
export function aggregateEffectivenessData(impactRows: {
  templateKey: string;
  objectType: string;
  completedAt: string | null;
  createdAt: string;
  status: string;
  metrics30d: ImpactMetrics | null;
}[]): EffectivenessRecord[] {
  const byTemplate = new Map<string, typeof impactRows>();

  for (const row of impactRows) {
    const key = row.templateKey;
    if (!byTemplate.has(key)) byTemplate.set(key, []);
    byTemplate.get(key)!.push(row);
  }

  const records: EffectivenessRecord[] = [];

  for (const [templateKey, rows] of byTemplate) {
    const completed = rows.filter((r) => r.status === 'completed');
    const completionRate = rows.length > 0 ? completed.length / rows.length : 0;

    const completionDays = completed
      .filter((r) => r.completedAt)
      .map((r) => {
        const created = new Date(r.createdAt).getTime();
        const resolved = new Date(r.completedAt!).getTime();
        return (resolved - created) / (1000 * 60 * 60 * 24);
      });

    const avgCompletionDays = completionDays.length > 0
      ? completionDays.reduce((a, b) => a + b, 0) / completionDays.length
      : 999;

    // Normalize 30d impact into 0–1 (use first positive delta found)
    const impactValues = completed
      .filter((r) => r.metrics30d)
      .map((r) => {
        const m = r.metrics30d!;
        const deltas = Object.values(m).filter((v): v is number => typeof v === 'number' && v > 0);
        return deltas.length > 0 ? Math.min(deltas.reduce((a, b) => a + b, 0) / deltas.length / 100, 1) : 0;
      });

    const avgImpact30d = impactValues.length > 0
      ? impactValues.reduce((a, b) => a + b, 0) / impactValues.length
      : 0;

    records.push({
      templateKey,
      objectType: rows[0]?.objectType ?? 'unknown',
      completionRate,
      avgCompletionDays,
      avgImpact30d,
      sampleSize: rows.length,
    });
  }

  return records;
}
