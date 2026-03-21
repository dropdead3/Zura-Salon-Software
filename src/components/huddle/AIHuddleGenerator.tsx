import { useState } from 'react';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Sparkles, Loader2, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGenerateAIHuddle, type GeneratedHuddleContent } from '@/hooks/useAIHuddle';

interface AIHuddleGeneratorProps {
  huddleDate: string;
  locationId?: string;
  onContentGenerated: (content: GeneratedHuddleContent) => void;
}

export function AIHuddleGenerator({ huddleDate, locationId, onContentGenerated }: AIHuddleGeneratorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<GeneratedHuddleContent | null>(null);
  const generateHuddle = useGenerateAIHuddle();
  const { formatCurrencyWhole } = useFormatCurrency();

  const handleGenerate = async () => {
    setDialogOpen(true);
    setPreviewContent(null);

    const result = await generateHuddle.mutateAsync({ huddleDate, locationId });
    if (result.content) {
      setPreviewContent(result.content);
    }
  };

  const handleApply = () => {
    if (previewContent) {
      onContentGenerated(previewContent);
      setDialogOpen(false);
      setPreviewContent(null);
    }
  };

  const handleRegenerate = async () => {
    setPreviewContent(null);
    const result = await generateHuddle.mutateAsync({ huddleDate, locationId });
    if (result.content) {
      setPreviewContent(result.content);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleGenerate}
        disabled={generateHuddle.isPending}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Generate with AI
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Generated Huddle Content
            </DialogTitle>
            <DialogDescription>
              Review the generated content and apply it to your huddle.
            </DialogDescription>
          </DialogHeader>

          {generateHuddle.isPending && !previewContent ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Analyzing data and generating content...</p>
            </div>
          ) : previewContent ? (
            <div className="space-y-4">
              {/* Focus of the Day */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium">🎯 Focus of the Day</h4>
                  <Badge variant="secondary" className="text-xs">
                    AI Generated
                  </Badge>
                </div>
                <p className="text-sm">{previewContent.focus_of_the_day}</p>
              </div>

              {/* Wins from Yesterday */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium">🏆 Yesterday's Wins</h4>
                  <Badge variant="secondary" className="text-xs">
                    AI Generated
                  </Badge>
                </div>
                <p className="text-sm whitespace-pre-line">{previewContent.wins_from_yesterday}</p>
              </div>

              {/* Announcements */}
              {previewContent.announcements && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">📢 Announcements</h4>
                    <Badge variant="secondary" className="text-xs">
                      AI Generated
                    </Badge>
                  </div>
                  <p className="text-sm whitespace-pre-line">{previewContent.announcements}</p>
                </div>
              )}

              {/* Celebrations */}
              {previewContent.birthdays_celebrations && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">🎂 Celebrations</h4>
                    <Badge variant="secondary" className="text-xs">
                      AI Generated
                    </Badge>
                  </div>
                  <p className="text-sm">{previewContent.birthdays_celebrations}</p>
                </div>
              )}

              {/* Training */}
              {previewContent.training_reminders && (
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">📚 Training Reminders</h4>
                    <Badge variant="secondary" className="text-xs">
                      AI Generated
                    </Badge>
                  </div>
                  <p className="text-sm">{previewContent.training_reminders}</p>
                </div>
              )}

              {/* Sales Goals */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium">💰 Sales Goals</h4>
                  <Badge variant="secondary" className="text-xs">
                    AI Generated
                  </Badge>
                </div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Retail:</span>{' '}
                    <span className="font-medium">{formatCurrencyWhole(previewContent.sales_goals.retail)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Service:</span>{' '}
                    <span className="font-medium">{formatCurrencyWhole(previewContent.sales_goals.service)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={generateHuddle.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                <Button onClick={handleApply}>
                  <Check className="h-4 w-4 mr-2" />
                  Apply to Huddle
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
