import { useState } from 'react';
import { Copy, Check, FileText, Clock, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { PlatformButton as Button } from '@/components/platform/ui/PlatformButton';
import { tokens } from '@/lib/design-tokens';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { usePandaDocStats } from '@/hooks/usePandaDocStats';
import { formatDistanceToNow } from 'date-fns';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const WEBHOOK_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/pandadoc-webhook` : '';

interface SecretStatusProps {
  name: string;
  label: string;
  description: string;
}

function SecretStatus({ name, label, description }: SecretStatusProps) {
  return (
    <div className="bg-[hsl(var(--platform-bg-card)/0.5)] rounded-lg p-4 border border-[hsl(var(--platform-border)/0.5)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[hsl(var(--platform-foreground)/0.9)]">{label}</p>
          <p className="text-xs text-[hsl(var(--platform-muted))] mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--platform-foreground-subtle))]">{name}</span>
        </div>
      </div>
    </div>
  );
}

export function PandaDocStatusCard() {
  const [copied, setCopied] = useState(false);
  const { data: stats, isLoading } = usePandaDocStats();

  const handleCopyWebhookUrl = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader>
        <div className="flex items-center justify-between">
          <div>
            <PlatformCardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[hsl(var(--platform-primary))]" />
              PandaDoc Integration
            </PlatformCardTitle>
            <PlatformCardDescription>
              Automate contract signing and billing setup
            </PlatformCardDescription>
          </div>
          <a 
            href="https://app.pandadoc.com/a/#/settings/integrations/webhook" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[hsl(var(--platform-primary))] hover:text-[hsl(var(--platform-primary)/0.8)] transition-colors"
          >
            <Button variant="outline" size={tokens.button.card} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              PandaDoc Settings
            </Button>
          </a>
        </div>
      </PlatformCardHeader>
      <PlatformCardContent className="space-y-6">
        {/* Webhook URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[hsl(var(--platform-foreground)/0.85)]">Webhook URL</label>
          <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">Add this URL in PandaDoc → Settings → Integrations → Webhooks</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[hsl(var(--platform-bg-elevated)/0.5)] border border-[hsl(var(--platform-border))] rounded-lg px-4 py-3 font-mono text-xs text-[hsl(var(--platform-foreground)/0.85)] overflow-x-auto">
              {WEBHOOK_URL}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyWebhookUrl}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Secrets Configuration */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-[hsl(var(--platform-foreground)/0.85)]">Configuration</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SecretStatus
              name="PANDADOC_API_KEY"
              label="API Key"
              description="Required for document retrieval"
            />
            <SecretStatus
              name="PANDADOC_WEBHOOK_SECRET"
              label="Webhook Secret"
              description="For signature verification"
            />
          </div>
          <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
            Configure these secrets in your backend to enable full functionality.
          </p>
        </div>

        {/* Statistics */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-[hsl(var(--platform-foreground)/0.85)]">Activity</label>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-[hsl(var(--platform-bg-card)/0.5)] rounded-lg p-4 border border-[hsl(var(--platform-border)/0.5)] animate-pulse">
                  <div className="h-4 bg-[hsl(var(--platform-border))] rounded w-16 mb-2" />
                  <div className="h-6 bg-[hsl(var(--platform-border))] rounded w-10" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[hsl(var(--platform-bg-card)/0.5)] rounded-lg p-4 border border-[hsl(var(--platform-border)/0.5)]">
                <div className="flex items-center gap-2 text-[hsl(var(--platform-muted))] mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs">Total</span>
                </div>
                <p className="text-2xl font-medium text-[hsl(var(--platform-foreground)/0.9)]">{stats?.totalDocuments ?? 0}</p>
              </div>
              <div className="bg-[hsl(var(--platform-bg-card)/0.5)] rounded-lg p-4 border border-[hsl(var(--platform-border)/0.5)]">
                <div className="flex items-center gap-2 text-amber-400 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Pending</span>
                </div>
                <p className="text-2xl font-medium text-[hsl(var(--platform-foreground)/0.9)]">{stats?.pendingDocuments ?? 0}</p>
              </div>
              <div className="bg-[hsl(var(--platform-bg-card)/0.5)] rounded-lg p-4 border border-[hsl(var(--platform-border)/0.5)]">
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs">Completed</span>
                </div>
                <p className="text-2xl font-medium text-[hsl(var(--platform-foreground)/0.9)]">{stats?.completedDocuments ?? 0}</p>
              </div>
              <div className="bg-[hsl(var(--platform-bg-card)/0.5)] rounded-lg p-4 border border-[hsl(var(--platform-border)/0.5)]">
                <div className="flex items-center gap-2 text-[hsl(var(--platform-primary))] mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">Applied</span>
                </div>
                <p className="text-2xl font-medium text-[hsl(var(--platform-foreground)/0.9)]">{stats?.appliedDocuments ?? 0}</p>
              </div>
            </div>
          )}
          {stats?.lastWebhookAt && (
            <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
              Last webhook received: {formatDistanceToNow(new Date(stats.lastWebhookAt), { addSuffix: true })}
            </p>
          )}
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}