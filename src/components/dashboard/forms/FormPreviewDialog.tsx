import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FormTemplate } from '@/hooks/useFormTemplates';

interface FormPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: FormTemplate | null;
}

export function FormPreviewDialog({ open, onOpenChange, template }: FormPreviewDialogProps) {
  if (!template) return null;

  // Simple markdown-like rendering (basic support)
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-medium mt-4 mb-2">{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-medium mt-4 mb-2">{line.slice(3)}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-medium mt-4 mb-2">{line.slice(2)}</h1>;
      }
      // Bold text
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={idx} className="mb-2">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={idx} className="ml-4 mb-1">{line.slice(2)}</li>;
      }
      // Numbered list items
      if (/^\d+\.\s/.test(line)) {
        return <li key={idx} className="ml-4 mb-1 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>;
      }
      // Empty lines
      if (!line.trim()) {
        return <br key={idx} />;
      }
      // Regular paragraphs
      return <p key={idx} className="mb-2">{line}</p>;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {template.name}
            <Badge variant="outline">{template.version}</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {renderContent(template.content)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
