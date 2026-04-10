import { MessageSquare, Zap, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CONNECT_APP_NAME, CONNECT_DESCRIPTOR } from '@/lib/brand';

interface ConnectSubscriptionGateProps {
  onActivate?: () => void;
}

const features = [
  {
    icon: MessageSquare,
    title: 'Team Channels',
    description: 'Organized conversations by topic, location, or department.',
  },
  {
    icon: Users,
    title: 'Direct Messages',
    description: 'Private 1:1 and group conversations with your team.',
  },
  {
    icon: Globe,
    title: 'Client Communications',
    description: 'SMS and in-app messaging with clients — coming soon.',
  },
  {
    icon: Zap,
    title: 'AI Smart Actions',
    description: 'Intelligent message actions powered by AI assistance.',
  },
];

export function ConnectSubscriptionGate({ onActivate }: ConnectSubscriptionGateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-xl w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-display uppercase tracking-wider">
            <Zap className="h-3.5 w-3.5" />
            Add-on
          </div>
          <h1 className="font-display text-2xl uppercase tracking-wide text-foreground">
            {CONNECT_APP_NAME}
          </h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            {CONNECT_DESCRIPTOR}. Unify your team and client communications in one powerful hub.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-4 rounded-xl border border-border/60 bg-card/50 space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="font-display text-xs uppercase tracking-wide text-foreground">
                  {feature.title}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="font-sans font-medium px-8"
            onClick={onActivate}
          >
            Contact Sales to Activate
          </Button>
          <p className="text-xs text-muted-foreground">
            Available as an add-on subscription to your current plan.
          </p>
        </div>
      </div>
    </div>
  );
}
