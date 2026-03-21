import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, ExternalLink, RefreshCw, Plus, CheckCircle2, Clock, Eye, XCircle, AlertTriangle } from 'lucide-react';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton as Button } from '@/components/platform/ui/PlatformButton';
import { PlatformBadge as Badge } from '@/components/platform/ui/PlatformBadge';
import { usePandaDocDocuments, useReapplyPandaDocFields } from '@/hooks/usePandaDocDocuments';
import { LinkPandaDocDialog } from './LinkPandaDocDialog';

interface PandaDocDocumentsCardProps {
  organizationId: string;
}

const statusConfig = {
  draft: { icon: FileText, label: 'Draft', variant: 'outline' as const, color: 'text-slate-400' },
  sent: { icon: Clock, label: 'Sent', variant: 'secondary' as const, color: 'text-blue-400' },
  viewed: { icon: Eye, label: 'Viewed', variant: 'secondary' as const, color: 'text-yellow-400' },
  completed: { icon: CheckCircle2, label: 'Completed', variant: 'default' as const, color: 'text-green-400' },
  voided: { icon: XCircle, label: 'Voided', variant: 'error' as const, color: 'text-red-400' },
  declined: { icon: AlertTriangle, label: 'Declined', variant: 'error' as const, color: 'text-red-400' },
};

export function PandaDocDocumentsCard({ organizationId }: PandaDocDocumentsCardProps) {
  const { data: documents, isLoading } = usePandaDocDocuments(organizationId);
  const reapplyFields = useReapplyPandaDocFields();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  return (
    <>
      <PlatformCard variant="glass">
        <PlatformCardHeader className="flex flex-row items-center justify-between">
          <div>
            <PlatformCardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-400" />
              PandaDoc Agreements
            </PlatformCardTitle>
            <PlatformCardDescription>
              Signed documents and agreements
            </PlatformCardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setLinkDialogOpen(true)}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Link Document
          </Button>
        </PlatformCardHeader>
        <PlatformCardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading documents...</div>
          ) : !documents?.length ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No documents linked yet</p>
              <p className="text-sm mt-1">Link a PandaDoc document or wait for webhook events</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const config = statusConfig[doc.status] || statusConfig.draft;
                const StatusIcon = config.icon;

                return (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${config.color}`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{doc.document_name}</span>
                          <Badge variant={config.variant} className="text-xs">
                            {config.label}
                          </Badge>
                          {doc.applied_to_billing && (
                            <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">
                              Applied
                            </Badge>
                          )}
                        </div>
                        {doc.signed_by_name && (
                          <p className="text-sm text-slate-400 mt-1">
                            Signed by: {doc.signed_by_name}
                            {doc.signed_by_email && ` (${doc.signed_by_email})`}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {doc.completed_at
                            ? `Completed: ${format(new Date(doc.completed_at), 'MMM d, yyyy')}`
                            : doc.sent_at
                            ? `Sent: ${format(new Date(doc.sent_at), 'MMM d, yyyy')}`
                            : `Created: ${format(new Date(doc.created_at), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.status === 'completed' && doc.extracted_fields && Object.keys(doc.extracted_fields).length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reapplyFields.mutate(doc.id)}
                          disabled={reapplyFields.isPending}
                          className="text-xs"
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${reapplyFields.isPending ? 'animate-spin' : ''}`} />
                          Re-apply Fields
                        </Button>
                      )}
                      {doc.document_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PlatformCardContent>
      </PlatformCard>

      <LinkPandaDocDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        organizationId={organizationId}
      />
    </>
  );
}
