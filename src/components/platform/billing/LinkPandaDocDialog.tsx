import { useState } from 'react';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  PlatformDialogDescription as DialogDescription,
  DialogFooter,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
} from '@/components/platform/ui/PlatformDialog';
import { PlatformButton as Button } from '@/components/platform/ui/PlatformButton';
import { PlatformInput as Input } from '@/components/platform/ui/PlatformInput';
import { PlatformLabel as Label } from '@/components/platform/ui/PlatformLabel';
import { useLinkPandaDocDocument } from '@/hooks/usePandaDocDocuments';

interface LinkPandaDocDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function LinkPandaDocDialog({ open, onOpenChange, organizationId }: LinkPandaDocDialogProps) {
  const [documentId, setDocumentId] = useState('');
  const [documentName, setDocumentName] = useState('');
  const linkDocument = useLinkPandaDocDocument();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId.trim() || !documentName.trim()) return;

    linkDocument.mutate(
      {
        organizationId,
        pandadocDocumentId: documentId.trim(),
        documentName: documentName.trim(),
      },
      {
        onSuccess: () => {
          setDocumentId('');
          setDocumentName('');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Link PandaDoc Document</DialogTitle>
          <DialogDescription className="text-slate-400">
            Manually link an existing PandaDoc document to this account.
            The document ID can be found in the PandaDoc URL.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documentId" className="text-slate-300">Document ID</Label>
            <Input
              id="documentId"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              placeholder="e.g., msfYWeHLfFJ3Yy3zyEQWpN"
              className="bg-slate-800 border-slate-700 text-white"
              autoCapitalize="none"
            />
            <p className="text-xs text-slate-500">
              Found in the URL: app.pandadoc.com/a/#/documents/<strong>[document_id]</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentName" className="text-slate-300">Document Name</Label>
            <Input
              id="documentName"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g., Service Agreement - 2026"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!documentId.trim() || !documentName.trim() || linkDocument.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {linkDocument.isPending ? 'Linking...' : 'Link Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
