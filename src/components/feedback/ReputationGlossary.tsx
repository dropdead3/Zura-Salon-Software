import { useEffect, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GlossaryTerm =
  | 'happiness'
  | 'reply-rate'
  | 'public-reviews'
  | 'momentum'
  | 'follow-up';

const ENTRIES: Array<{ id: GlossaryTerm; term: string; body: string }> = [
  {
    id: 'happiness',
    term: 'Client Happiness',
    body: "A single 0–100 score showing how your clients feel overall. Anything above 30 is healthy, above 50 is excellent. It moves up when more clients say they love you and down when more say they're unhappy.",
  },
  {
    id: 'reply-rate',
    term: 'Reply Rate',
    body: 'Of the feedback requests we send out, the share that actually get a reply. A higher number means more clients are voicing their experience — and giving you more chances to act.',
  },
  {
    id: 'public-reviews',
    term: 'Public Reviews',
    body: 'When a happy client clicks through to leave a public review on Google, Yelp, or Facebook. This is how your reputation grows where new clients are searching.',
  },
  {
    id: 'momentum',
    term: 'Review Momentum',
    body: 'How many of those public review click-throughs you got in the last 30 days vs. the 30 days before. Going up means your reputation is compounding; going down is an early warning.',
  },
  {
    id: 'follow-up',
    term: 'Unhappy Client Follow-Up',
    body: 'When a client gives unhappy feedback, we open a follow-up task. The faster you reach out (ideally within 24 hours), the more likely they come back and the less likely they leave a bad public review.',
  },
];

export const REPUTATION_GLOSSARY_OPEN_EVENT = 'reputation-glossary-open';

/** Dispatch from anywhere to open the glossary, optionally scrolled to a term. */
export function openReputationGlossary(term?: GlossaryTerm) {
  // eslint-disable-next-line no-restricted-syntax
  window.dispatchEvent(new CustomEvent(REPUTATION_GLOSSARY_OPEN_EVENT, { detail: { term } }));
}

interface ReputationGlossaryProps {
  /** Auto-open on first visit (gated on localStorage flag). */
  autoOpenOnFirstVisit?: boolean;
}

const SEEN_FLAG = 'reputation-glossary-seen';

export function ReputationGlossary({ autoOpenOnFirstVisit }: ReputationGlossaryProps = {}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<GlossaryTerm | null>(null);
  const itemRefs = useRef<Partial<Record<GlossaryTerm, HTMLLIElement | null>>>({});

  // First-visit auto-open
  useEffect(() => {
    if (!autoOpenOnFirstVisit) return;
    if (typeof window === 'undefined') return;
    try {
      if (!window.localStorage.getItem(SEEN_FLAG)) {
        setOpen(true);
        window.localStorage.setItem(SEEN_FLAG, '1');
      }
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [autoOpenOnFirstVisit]);

  // External open requests (deep-links from MetricInfoTooltip "Learn more")
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ term?: GlossaryTerm }>).detail;
      setHighlight(detail?.term ?? null);
      setOpen(true);
    };
    window.addEventListener(REPUTATION_GLOSSARY_OPEN_EVENT, handler);
    return () => window.removeEventListener(REPUTATION_GLOSSARY_OPEN_EVENT, handler);
  }, []);

  // Scroll highlighted term into view after open
  useEffect(() => {
    if (!open || !highlight) return;
    const t = setTimeout(() => {
      itemRefs.current[highlight]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    return () => clearTimeout(t);
  }, [open, highlight]);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setHighlight(null); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          New to reviews? Start here
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-h-[70vh] overflow-y-auto">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">Reputation in plain English</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Five things this page tracks — and why each one matters for your salon.
            </p>
          </div>
          <ul className="space-y-3">
            {ENTRIES.map((e) => (
              <li
                key={e.id}
                ref={(el) => { itemRefs.current[e.id] = el; }}
                className={cn(
                  'space-y-1 rounded-md transition-colors -mx-2 px-2 py-1.5',
                  highlight === e.id && 'bg-muted ring-1 ring-border',
                )}
              >
                <p className="text-xs font-medium">{e.term}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{e.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
