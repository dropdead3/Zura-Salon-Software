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

// Derive webhook URL from Supabase URL so it works with your own project
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const WEBHOOK_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/pandadoc-webhook` : '';

// Note: We can't check secrets from client-side, so we show a static configuration section
// In production, you'd have an edge function to verify secret status

interface SecretStatusProps {
  name: string;
  label: string;
  description: string;
}

function SecretStatus({ name, label, description }: SecretStatusProps) {
  // Since we can't check secrets from client-side, we show guidance
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">{label}</p>
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{name}</span>
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
              <FileText className="h-5 w-5 text-violet-400" />
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
            className="text-violet-400 hover:text-violet-300 transition-colors"
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
          <label className="text-sm font-medium text-slate-300">Webhook URL</label>
          <p className="text-xs text-slate-500">Add this URL in PandaDoc → Settings → Integrations → Webhooks</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 font-mono text-xs text-slate-300 overflow-x-auto">
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
          <label className="text-sm font-medium text-slate-300">Configuration</label>
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
          <p className="text-xs text-slate-500">
            Configure these secrets in your backend to enable full functionality.
          </p>
        </div>

        {/* Statistics */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-300">Activity</label>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-16 mb-2" />
                  <div className="h-6 bg-slate-700 rounded w-10" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="text-xs">Total</span>
                </div>
                <p className="text-2xl font-medium text-slate-100">{stats?.totalDocuments ?? 0}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-amber-400 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Pending</span>
                </div>
                <p className="text-2xl font-medium text-slate-100">{stats?.pendingDocuments ?? 0}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs">Completed</span>
                </div>
                <p className="text-2xl font-medium text-slate-100">{stats?.completedDocuments ?? 0}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-violet-400 mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">Applied</span>
                </div>
                <p className="text-2xl font-medium text-slate-100">{stats?.appliedDocuments ?? 0}</p>
              </div>
            </div>
          )}
          {stats?.lastWebhookAt && (
            <p className="text-xs text-slate-500">
              Last webhook received: {formatDistanceToNow(new Date(stats.lastWebhookAt), { addSuffix: true })}
            </p>
          )}
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}
