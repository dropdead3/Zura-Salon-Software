import { FileText, Image, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentDisplayProps {
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  onRemove?: () => void;
  compact?: boolean;
}

export function AttachmentDisplay({ fileName, fileUrl, fileType, fileSize, onRemove, compact }: AttachmentDisplayProps) {
  const isImage = fileType?.startsWith('image/');
  
  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isImage) {
    return (
      <div className={cn('relative group', compact ? 'max-w-[200px]' : 'max-w-sm')}>
        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={fileUrl}
            alt={fileName}
            className="rounded-lg border max-h-48 object-cover hover:opacity-90 transition-opacity"
          />
        </a>
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-3 p-2 rounded-lg border bg-muted/30 group',
      compact ? 'max-w-[200px]' : 'max-w-sm'
    )}>
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium hover:underline truncate block"
        >
          {fileName}
        </a>
        {fileSize && (
          <span className="text-xs text-muted-foreground">{formatSize(fileSize)}</span>
        )}
      </div>
      <a
        href={fileUrl}
        download={fileName}
        className="h-8 w-8 flex items-center justify-center rounded hover:bg-accent transition-colors"
      >
        <Download className="h-4 w-4" />
      </a>
      {onRemove && (
        <button
          onClick={onRemove}
          className="h-8 w-8 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive transition-colors opacity-0 group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
