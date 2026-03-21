import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Lightbulb, Bug, Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { useSubmitPlatformFeedback } from '@/hooks/usePlatformFeedback';
import { PLATFORM_NAME } from '@/lib/brand';

type FeedbackType = 'feature_request' | 'bug_report';

interface PlatformFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: FeedbackType;
}

const CATEGORIES = [
  { value: 'ui', label: 'UI / Design' },
  { value: 'performance', label: 'Performance' },
  { value: 'scheduling', label: 'Scheduling' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'other', label: 'Other' },
];

export function PlatformFeedbackDialog({ open, onOpenChange, defaultType = 'feature_request' }: PlatformFeedbackDialogProps) {
  const [type, setType] = useState<FeedbackType>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mutation = useSubmitPlatformFeedback();

  // Reset when defaultType changes
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setType(defaultType);
      setTitle('');
      setDescription('');
      setCategory('other');
      setFiles([]);
    }
    onOpenChange(open);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutation.mutateAsync({
      type,
      title,
      description,
      category,
      screenshots: files.length > 0 ? files : undefined,
    });
    handleOpenChange(false);
  };

  const isBug = type === 'bug_report';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            {isBug ? <Bug className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}
            {isBug ? 'Report a Bug' : 'Request a Feature'}
          </DialogTitle>
          <DialogDescription>
            {isBug
              ? 'Help us fix issues by describing what went wrong.'
              : `Share your ideas to help us improve ${PLATFORM_NAME}.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('feature_request')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                type === 'feature_request'
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60"
              )}
            >
              <Lightbulb className="h-4 w-4" />
              Feature
            </button>
            <button
              type="button"
              onClick={() => setType('bug_report')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                type === 'bug_report'
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60"
              )}
            >
              <Bug className="h-4 w-4" />
              Bug
            </button>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="feedback-title">Title</Label>
            <Input
              id="feedback-title"
              placeholder={isBug ? "Brief description of the issue" : "What feature would you like?"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="feedback-desc">Description</Label>
            <Textarea
              id="feedback-desc"
              placeholder={isBug ? "Steps to reproduce, expected vs actual behavior..." : "Describe the feature and why it would be helpful..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-1.5">
            <Label>{isBug ? 'Attach a screenshot to help us understand the issue' : 'Attach images (optional)'}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-sm transition-colors",
                "text-muted-foreground hover:text-foreground hover:border-foreground/30 border-border",
                isBug && "border-primary/30 bg-primary/5"
              )}
            >
              {isBug ? <ImageIcon className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
              {isBug ? 'Upload screenshot' : 'Upload images'}
            </button>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs">
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !title.trim() || !description.trim()}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Submit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
