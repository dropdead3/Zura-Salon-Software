/**
 * Card Questions Uniqueness — author-time invariant.
 *
 * Doctrine: every Command Center pinned card must answer one structurally
 * distinct question. Two cards sharing the same question is redundancy by
 * definition (mem://architecture/canon-pattern).
 */
import { describe, expect, it } from 'vitest';
import { CARD_QUESTIONS } from '@/components/dashboard/analytics/cardQuestions';
import { CARD_DESCRIPTIONS } from '@/components/dashboard/analytics/cardDescriptions';
import { PINNABLE_CARDS } from '@/components/dashboard/DashboardCustomizeMenu';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

describe('Card Questions registry', () => {
  it('contains no duplicate questions across cards', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    for (const [cardId, question] of Object.entries(CARD_QUESTIONS)) {
      const key = norm(question);
      const previous = seen.get(key);
      if (previous) {
        duplicates.push(`"${previous}" and "${cardId}" both ask: ${question}`);
      } else {
        seen.set(key, cardId);
      }
    }

    expect(duplicates, duplicates.join('\n')).toEqual([]);
  });

  it('every entry is a non-empty question ending with a question mark', () => {
    for (const [cardId, question] of Object.entries(CARD_QUESTIONS)) {
      expect(question.length, `${cardId} has empty question`).toBeGreaterThan(0);
      expect(question.trim().endsWith('?'), `${cardId} question must end with "?"`).toBe(true);
    }
  });

  it('every PINNABLE_CARDS entry has a CARD_QUESTIONS entry', () => {
    const missing = PINNABLE_CARDS
      .map(c => c.id)
      .filter(id => !(id in CARD_QUESTIONS));
    expect(missing, `Missing CARD_QUESTIONS for: ${missing.join(', ')}`).toEqual([]);
  });

  it('every PINNABLE_CARDS entry has a CARD_DESCRIPTIONS entry', () => {
    const missing = PINNABLE_CARDS
      .map(c => c.id)
      .filter(id => !(id in CARD_DESCRIPTIONS));
    expect(missing, `Missing CARD_DESCRIPTIONS for: ${missing.join(', ')}`).toEqual([]);
  });
});
