import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Check, Mail } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { HealthClient } from '@/hooks/useClientHealthSegments';

interface EmailOutreachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: HealthClient[];
  segmentLabel: string;
}

export function EmailOutreachDialog({ open, onOpenChange, clients, segmentLabel }: EmailOutreachDialogProps) {
  const { data: templates, isLoading: templatesLoading } = useEmailTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const activeTemplates = templates?.filter(t => t.is_active) || [];
  const selectedTemplateData = activeTemplates.find(t => t.id === selectedTemplate);
  const clientsWithEmail = clients.filter(c => c.email);

  const handleSend = async () => {
    if (!selectedTemplateData || clientsWithEmail.length === 0) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('process-client-automations', {
        body: {
          action: 'bulk_outreach',
          template_key: selectedTemplateData.template_key,
          client_ids: clientsWithEmail.map(c => c.id),
          segment: segmentLabel,
        },
      });
      if (error) throw error;
      setSent(true);
      toast.success(`Sending emails to ${clientsWithEmail.length} clients`);
      setTimeout(() => {
        onOpenChange(false);
        setSent(false);
        setSelectedTemplate('');
      }, 1500);
    } catch (err) {
      console.error('Email outreach error:', err);
      toast.error('Failed to send outreach emails');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" overlayClassName="backdrop-blur-sm bg-black/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Outreach
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Send to {clientsWithEmail.length} clients with email addresses
            {clients.length - clientsWithEmail.length > 0 && (
              <span className="text-destructive"> ({clients.length - clientsWithEmail.length} without email will be skipped)</span>
            )}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Template</label>
            {templatesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading templates...
              </div>
            ) : (
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {activeTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedTemplateData && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Preview</label>
              <div className="border rounded-lg p-3 bg-muted/30 space-y-1">
                <p className="text-sm font-medium">Subject: {selectedTemplateData.subject}</p>
                <p className="text-xs text-muted-foreground">{selectedTemplateData.description || 'No description'}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Recipients ({clientsWithEmail.length})</label>
            <ScrollArea className="h-32 border rounded-lg">
              <div className="p-2 space-y-1">
                {clientsWithEmail.slice(0, 20).map(c => (
                  <div key={c.id} className="text-xs flex justify-between px-2 py-1">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground">{c.email}</span>
                  </div>
                ))}
                {clientsWithEmail.length > 20 && (
                  <p className="text-xs text-muted-foreground px-2 py-1">
                    ...and {clientsWithEmail.length - 20} more
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size={tokens.button.card} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size={tokens.button.card}
            onClick={handleSend}
            disabled={!selectedTemplate || clientsWithEmail.length === 0 || sending || sent}
            className="gap-1.5"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {sent ? 'Sent!' : `Send to ${clientsWithEmail.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
