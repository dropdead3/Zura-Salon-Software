import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

const ENTRIES: Array<{ term: string; body: string }> = [
  {
    term: 'Client Happiness',
    body: 'A single 0–100 score showing how your clients feel overall. Anything above 30 is healthy, above 50 is excellent. It moves up when more clients say they love you and down when more say they\'re unhappy.',
  },
  {
    term: 'Reply Rate',
    body: 'Of the feedback requests we send out, the share that actually get a reply. A higher number means more clients are voicing their experience — and giving you more chances to act.',
  },
  {
    term: 'Public Reviews',
    body: 'When a happy client clicks through to leave a public review on Google, Yelp, or Facebook. This is how your reputation grows where new clients are searching.',
  },
  {
    term: 'Review Momentum',
    body: 'How many of those public review click-throughs you got in the last 30 days vs. the 30 days before. Going up means your reputation is compounding; going down is an early warning.',
  },
  {
    term: 'Unhappy Client Follow-Up',
    body: 'When a client gives unhappy feedback, we open a follow-up task. The faster you reach out (ideally within 24 hours), the more likely they come back and the less likely they leave a bad public review.',
  },
];

export function ReputationGlossary() {
  return (
    <Popover>
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
              <li key={e.term} className="space-y-1">
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
