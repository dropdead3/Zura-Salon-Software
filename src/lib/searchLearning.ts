/**
 * Zura Search Learning System
 * Event logging, signal computation, time-decay, query→path affinity,
 * abandonment detection, reformulation chains, and observability.
 *
 * Pure logic — no React, no API calls.
 */

import type { RankedResultType } from '@/lib/searchRanker';

// ─── Event Types ────────────────────────────────────────────

export interface SearchEvent {
  id: string;
  timestamp: number;
  query: string;
  normalizedQuery: string;
  resultCount: number;
  selectedPath: string | null;
  selectedRank: number | null;
  selectedType: RankedResultType | null;
  topScore: number | null;
  roleContext: string[];
  currentPath: string;
  reformulationOf: string | null;
  sessionId: string;
}

export interface LearningBoost {
  queryPathBoost: number;   // 0–0.15
  decayedFrequency: number; // 0–1 normalized
}

// ─── Constants ──────────────────────────────────────────────

const EVENTS_KEY_BASE = 'zura-search-events';
const FREQ_KEY_BASE = 'zura-nav-frequency-v2';
const GC_INTERVAL_KEY_BASE = 'zura-search-gc-last';
const MAX_EVENTS = 500;
const EVENT_TTL_DAYS = 90;
const FREQ_TTL_DAYS = 60;
const MAX_TIMESTAMPS_PER_PATH = 30;
const DECAY_RATE = 0.95;
const QPA_MIN_SELECTIONS = 3;
const ABANDONMENT_MIN_OCCURRENCES = 5;
const ABANDONMENT_HIGH_THRESHOLD = 0.6;
const QPA_MAX_BOOST = 0.15;
const FREQ_NORMALIZE_CEILING = 15;
const GC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// ─── Org-Scoped Keys ───────────────────────────────────────

let _orgId: string | undefined;

export function setOrgScope(orgId?: string): void {
  _orgId = orgId;
}

function scopedKey(base: string): string {
  return _orgId ? `${base}:${_orgId}` : base;
}

const EVENTS_KEY = (): string => scopedKey(EVENTS_KEY_BASE);
const FREQ_KEY = (): string => scopedKey(FREQ_KEY_BASE);
const GC_INTERVAL_KEY = (): string => scopedKey(GC_INTERVAL_KEY_BASE);

// ─── Helpers ────────────────────────────────────────────────

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function daysSince(timestamp: number): number {
  return (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
}

// ─── Event Storage (Ring Buffer) ────────────────────────────

function readEvents(): SearchEvent[] {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY()) || '[]');
  } catch {
    return [];
  }
}

function writeEvents(events: SearchEvent[]): void {
  try {
    localStorage.setItem(EVENTS_KEY(), JSON.stringify(events));
  } catch {
    // localStorage full or unavailable
  }
}

export function logSearchEvent(
  event: Omit<SearchEvent, 'id' | 'normalizedQuery'>,
): string {
  const id = generateId();
  const full: SearchEvent = {
    ...event,
    id,
    normalizedQuery: normalizeQuery(event.query),
  };
  const events = readEvents();
  events.push(full);
  // Ring buffer: keep only last MAX_EVENTS
  writeEvents(events.slice(-MAX_EVENTS));
  return id;
}

// ─── Garbage Collection ─────────────────────────────────────

export function runGarbageCollection(): void {
  try {
    const lastGC = parseInt(localStorage.getItem(GC_INTERVAL_KEY()) || '0', 10);
    if (Date.now() - lastGC < GC_INTERVAL_MS) return;

    // Prune old events
    const cutoff = Date.now() - EVENT_TTL_DAYS * 24 * 60 * 60 * 1000;
    const events = readEvents().filter((e) => e.timestamp >= cutoff);
    writeEvents(events);

    // Prune old frequency timestamps
    const freqCutoff = Date.now() - FREQ_TTL_DAYS * 24 * 60 * 60 * 1000;
    const freqMap = readFrequencyTimestamps();
    const pruned: Record<string, number[]> = {};
    for (const [path, timestamps] of Object.entries(freqMap)) {
      const valid = timestamps.filter((t) => t >= freqCutoff);
      if (valid.length > 0) pruned[path] = valid;
    }
    writeFrequencyTimestamps(pruned);

    localStorage.setItem(GC_INTERVAL_KEY(), String(Date.now()));
  } catch {
    // Silent failure
  }
}

// ─── Frequency with Timestamps ──────────────────────────────

function readFrequencyTimestamps(): Record<string, number[]> {
  try {
    return JSON.parse(localStorage.getItem(FREQ_KEY()) || '{}');
  } catch {
    return {};
  }
}

function writeFrequencyTimestamps(map: Record<string, number[]>): void {
  try {
    localStorage.setItem(FREQ_KEY(), JSON.stringify(map));
  } catch {
    // localStorage unavailable
  }
}

export function trackFrequencyTimestamp(path: string): void {
  const map = readFrequencyTimestamps();
  const timestamps = map[path] || [];
  timestamps.push(Date.now());
  // Keep last N timestamps
  map[path] = timestamps.slice(-MAX_TIMESTAMPS_PER_PATH);
  writeFrequencyTimestamps(map);
}

export function getDecayedFrequency(path: string): number {
  const map = readFrequencyTimestamps();
  const timestamps = map[path];
  if (!timestamps || timestamps.length === 0) return 0;

  let score = 0;
  for (const ts of timestamps) {
    const days = daysSince(ts);
    score += Math.pow(DECAY_RATE, days);
  }
  return Math.min(score / FREQ_NORMALIZE_CEILING, 1);
}

export function getDecayedFrequencyMap(): Record<string, number> {
  const map = readFrequencyTimestamps();
  const result: Record<string, number> = {};
  for (const path of Object.keys(map)) {
    const val = getDecayedFrequency(path);
    if (val > 0.01) result[path] = val;
  }
  return result;
}

// ─── Query → Path Affinity (QPA) ───────────────────────────

export function getQueryPathAffinity(query: string): Map<string, number> {
  const norm = normalizeQuery(query);
  const events = readEvents();
  const affinity = new Map<string, number>();

  for (const evt of events) {
    if (evt.normalizedQuery === norm && evt.selectedPath) {
      affinity.set(evt.selectedPath, (affinity.get(evt.selectedPath) || 0) + 1);
    }
  }

  // Suppress below threshold
  for (const [path, count] of affinity) {
    if (count < QPA_MIN_SELECTIONS) {
      affinity.delete(path);
    }
  }

  return affinity;
}

function computeQPABoost(query: string, candidatePath: string): number {
  const affinity = getQueryPathAffinity(query);
  const count = affinity.get(candidatePath);
  if (!count) return 0;

  // Find the max across all paths for this query for normalization
  let maxCount = 0;
  for (const c of affinity.values()) {
    if (c > maxCount) maxCount = c;
  }

  return Math.min((count / maxCount) * QPA_MAX_BOOST, QPA_MAX_BOOST);
}

// ─── Abandonment Rate ───────────────────────────────────────

export function getAbandonmentRate(query: string): { rate: number; total: number } {
  const norm = normalizeQuery(query);
  const events = readEvents();
  let total = 0;
  let abandoned = 0;

  for (const evt of events) {
    if (evt.normalizedQuery === norm && evt.resultCount > 0) {
      total++;
      if (!evt.selectedPath) abandoned++;
    }
  }

  if (total < ABANDONMENT_MIN_OCCURRENCES) return { rate: 0, total };
  return { rate: abandoned / total, total };
}

// ─── Zero-Result Queries ────────────────────────────────────

export function getZeroResultQueries(): { query: string; count: number; lastSeen: number }[] {
  const events = readEvents();
  const map = new Map<string, { count: number; lastSeen: number }>();

  for (const evt of events) {
    if (evt.resultCount === 0 || (evt.topScore !== null && evt.topScore < 0.3)) {
      const existing = map.get(evt.normalizedQuery);
      if (existing) {
        existing.count++;
        existing.lastSeen = Math.max(existing.lastSeen, evt.timestamp);
      } else {
        map.set(evt.normalizedQuery, { count: 1, lastSeen: evt.timestamp });
      }
    }
  }

  return Array.from(map.entries())
    .map(([query, data]) => ({ query, ...data }))
    .sort((a, b) => b.count - a.count);
}

// ─── Reformulation Chains ───────────────────────────────────

export function charOverlap(a: string, b: string): number {
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  let matches = 0;
  for (const char of shorter) {
    if (longer.includes(char)) matches++;
  }
  return shorter.length > 0 ? matches / shorter.length : 0;
}

export function detectReformulations(events: SearchEvent[]): {
  original: string;
  final: string;
  count: number;
}[] {
  const chains = new Map<string, { final: string; count: number }>();

  // Group by session
  const sessions = new Map<string, SearchEvent[]>();
  for (const evt of events) {
    const arr = sessions.get(evt.sessionId) || [];
    arr.push(evt);
    sessions.set(evt.sessionId, arr);
  }

  for (const sessionEvents of sessions.values()) {
    const sorted = sessionEvents.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];
      const timeDiff = (next.timestamp - curr.timestamp) / 1000;

      if (
        timeDiff < 10 &&
        charOverlap(curr.normalizedQuery, next.normalizedQuery) >= 0.6 &&
        curr.normalizedQuery !== next.normalizedQuery &&
        !curr.selectedPath &&
        next.selectedPath
      ) {
        const key = `${curr.normalizedQuery}→${next.normalizedQuery}`;
        const existing = chains.get(key);
        if (existing) {
          existing.count++;
        } else {
          chains.set(key, { final: next.normalizedQuery, count: 1 });
        }
      }
    }
  }

  return Array.from(chains.entries()).map(([key, data]) => ({
    original: key.split('→')[0],
    final: data.final,
    count: data.count,
  }));
}

// ─── Compute Learning Boosts ────────────────────────────────

export function computeLearningBoosts(
  query: string,
  candidatePath: string,
): LearningBoost {
  const queryPathBoost = computeQPABoost(query, candidatePath);
  const decayedFrequency = getDecayedFrequency(candidatePath);

  return {
    queryPathBoost,
    decayedFrequency,
  };
}

// ─── Health Report (Observability) ──────────────────────────

export interface SearchHealthReport {
  totalEvents: number;
  uniqueQueries: number;
  zeroResultQueries: { query: string; count: number }[];
  highAbandonmentQueries: { query: string; rate: number; count: number }[];
  topQueryPathPairs: { query: string; path: string; count: number }[];
  reformulationChains: { original: string; final: string; count: number }[];
}

export function getSearchHealthReport(): SearchHealthReport {
  const events = readEvents();
  const uniqueQueries = new Set(events.map((e) => e.normalizedQuery)).size;

  // Zero results
  const zeroResultQueries = getZeroResultQueries().slice(0, 20);

  // High abandonment
  const querySet = new Set(events.map((e) => e.normalizedQuery));
  const highAbandonmentQueries: SearchHealthReport['highAbandonmentQueries'] = [];
  for (const nq of querySet) {
    const { rate, total } = getAbandonmentRate(nq);
    if (rate >= ABANDONMENT_HIGH_THRESHOLD && total >= ABANDONMENT_MIN_OCCURRENCES) {
      highAbandonmentQueries.push({ query: nq, rate, count: total });
    }
  }
  highAbandonmentQueries.sort((a, b) => b.rate - a.rate);

  // Top query→path pairs
  const pairMap = new Map<string, number>();
  for (const evt of events) {
    if (evt.selectedPath) {
      const key = `${evt.normalizedQuery}|||${evt.selectedPath}`;
      pairMap.set(key, (pairMap.get(key) || 0) + 1);
    }
  }
  const topQueryPathPairs = Array.from(pairMap.entries())
    .map(([key, count]) => {
      const [query, path] = key.split('|||');
      return { query, path, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Reformulation chains
  const reformulationChains = detectReformulations(events)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    totalEvents: events.length,
    uniqueQueries,
    zeroResultQueries,
    highAbandonmentQueries: highAbandonmentQueries.slice(0, 20),
    topQueryPathPairs,
    reformulationChains,
  };
}

// ─── Dev-mode console access ────────────────────────────────

if (typeof window !== 'undefined') {
  (window as any).__zuraSearchHealth = getSearchHealthReport;
}
