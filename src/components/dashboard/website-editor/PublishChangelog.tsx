import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Navigation, FileText, Loader2, Check, Globe, Palette } from 'lucide-react';
import { useChangelogSummary, usePublishAll } from '@/hooks/usePublishChangelog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PublishChangelogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishChangelog({ open, onOpenChange }: PublishChangelogProps) {
  const { navChanges, pageChanges, siteChanges, totalChanges } = useChangelogSummary();
  const publishAll = usePublishAll();
  const [done, setDone] = useState(false);

  const handlePublish = async () => {
    try {
      await publishAll.mutateAsync();
      setDone(true);
      toast.success('All changes published');
      setTimeout(() => {
        onOpenChange(false);
        setDone(false);
      }, 1500);
    } catch {
      toast.error('Failed to publish');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Publish Changes
          </DialogTitle>
          <DialogDescription>
            Review and publish all pending changes across navigation and pages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Navigation Changes */}
          {navChanges.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Navigation</span>
                <Badge variant="secondary" className="text-[10px] h-5">{navChanges.length}</Badge>
              </div>
              <div className="space-y-1 pl-6">
                {navChanges.map(c => (
                  <div key={c.id} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                    <span>{c.label}</span>
                    {c.detail && <span className="text-muted-foreground/60">— {c.detail}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Page Changes */}
          {pageChanges.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Pages</span>
                <Badge variant="secondary" className="text-[10px] h-5">{pageChanges.length}</Badge>
              </div>
              <div className="space-y-1 pl-6">
                {pageChanges.map(c => (
                  <div key={c.id} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      c.type === 'status_change' ? "bg-muted-foreground/40" : "bg-primary/60"
                    )} />
                    <span>{c.label}</span>
                    {c.detail && <span className="text-muted-foreground/60">— {c.detail}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Site-wide Changes */}
          {siteChanges.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Site-wide</span>
                <Badge variant="secondary" className="text-[10px] h-5">{siteChanges.length}</Badge>
              </div>
              <div className="space-y-1 pl-6">
                {siteChanges.map(c => (
                  <div key={c.id} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                    <span>{c.label}</span>
                    {c.detail && <span className="text-muted-foreground/60">— {c.detail}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={publishAll.isPending || done || totalChanges === 0}
          >
            {publishAll.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing…</>
            ) : done ? (
              <><Check className="w-3.5 h-3.5" /> Published</>
            ) : (
              <>Publish All ({totalChanges})</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Button trigger with dot indicator */
export function PublishChangesButton() {
  const [open, setOpen] = useState(false);
  const { hasChanges, totalChanges } = useChangelogSummary();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 px-3 gap-1.5"
      >
        <Globe className="w-3.5 h-3.5" />
        Publish
      </Button>
      <PublishChangelog open={open} onOpenChange={setOpen} />
    </>
  );
}
