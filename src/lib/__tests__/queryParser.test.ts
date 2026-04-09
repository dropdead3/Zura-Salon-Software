import { describe, it, expect } from 'vitest';
import { parseQuery } from '../queryParser';

describe('parseQuery', () => {
  it('returns empty result for empty input', () => {
    const result = parseQuery('');
    expect(result.raw).toBe('');
    expect(result.tokens).toHaveLength(0);
    expect(result.confidence.overall).toBe(0);
  });

  it('returns minimal result for single character', () => {
    const result = parseQuery('a');
    expect(result.tokens).toHaveLength(1);
    expect(result.intents[0].type).toBe('ambiguous');
  });

  it('detects time context: "last 30 days"', () => {
    const result = parseQuery('revenue last 30 days');
    expect(result.timeContext).not.toBeNull();
    expect(result.timeContext?.value).toBe('30d');
    expect(result.timeContext?.label).toBe('Last 30 Days');
    expect(result.timeContext?.startDate).toBeTruthy();
  });

  it('detects action intent: "add client"', () => {
    const result = parseQuery('add client');
    expect(result.actionIntent).not.toBeNull();
    expect(result.actionIntent?.type).toBe('create_client');
    expect(result.actionIntent?.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.intents.find((i) => i.type === 'action_request')?.confidence).toBeGreaterThan(0);
  });

  it('detects filter: "no shows last week"', () => {
    const result = parseQuery('no shows last week');
    expect(result.filters.status).toBe('no_show');
    expect(result.timeContext?.value).toBe('lastWeek');
    expect(result.intents.find((i) => i.type === 'analytics_query')?.confidence).toBeGreaterThan(0);
  });

  it('detects help query: "how do refunds work"', () => {
    const result = parseQuery('how do refunds work');
    const helpIntent = result.intents.find((i) => i.type === 'help_query');
    expect(helpIntent).toBeDefined();
    expect(helpIntent!.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('handles analytics query: "Brooklyn retail last 30 days"', () => {
    const result = parseQuery('Brooklyn retail last 30 days');
    expect(result.timeContext?.value).toBe('30d');
    const analyticsIntent = result.intents.find((i) => i.type === 'analytics_query');
    expect(analyticsIntent).toBeDefined();
    expect(analyticsIntent!.confidence).toBeGreaterThan(0.5);
    expect(result.entities.length).toBeGreaterThanOrEqual(0);
    expect(result.remainingTokens).toContain('Brooklyn');
  });

  it('detects navigation intent for nav words', () => {
    const result = parseQuery('settings');
    const navIntent = result.intents.find((i) => i.type === 'navigation');
    expect(navIntent).toBeDefined();
    expect(navIntent!.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('handles multi-word action: "check in"', () => {
    const result = parseQuery('check in');
    expect(result.actionIntent).not.toBeNull();
    expect(result.actionIntent?.type).toBe('check_in');
  });

  it('handles filter with number: "top 10 clients"', () => {
    const result = parseQuery('top 10 clients');
    expect(result.filters.rank).toBe('top');
    expect(result.filters.limit).toBe(10);
  });

  it('treats pure number as transaction candidate', () => {
    const result = parseQuery('12345');
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].type).toBe('transaction');
  });

  it('classifies mixed intent: "Ashley appointments last month"', () => {
    const result = parseQuery('Ashley appointments last month');
    expect(result.intents.length).toBeGreaterThanOrEqual(2);
    const types = result.intents.map((i) => i.type);
    expect(types).toContain('analytics_query');
    expect(result.timeContext?.value).toBe('lastMonth');
  });

  it('handles "refund last transaction"', () => {
    const result = parseQuery('refund last transaction');
    expect(result.actionIntent?.type).toContain('refund');
  });

  it('detects "new clients" filter', () => {
    const result = parseQuery('new clients this month');
    expect(result.filters.client_type).toBe('new');
    expect(result.timeContext?.value).toBe('thisMonth');
  });
});
