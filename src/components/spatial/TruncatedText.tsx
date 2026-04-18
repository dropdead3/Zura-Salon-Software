import { cn } from '@/lib/utils';
import { truncationStrategyFor, type ContentKind } from '@/lib/responsive/priority';

interface TruncatedTextProps {
  children: string;
  kind?: ContentKind;
  className?: string;
  /** Override clamp lines (only applies for kind='description'). */
  lines?: 1 | 2;
  as?: 'span' | 'div' | 'p';
}

/**
 * TruncatedText — priority-aware text truncation.
 * - name/label/description → end-truncate (or line-clamp for descriptions)
 * - identifier → middle-truncate (preserves both ends)
 * - numeric → never truncates (refuses; reflows naturally instead)
 *
 * Doctrine: mem://style/container-aware-responsiveness.md §6
 */
export function TruncatedText({
  children,
  kind = 'name',
  className,
  lines = 1,
  as: Tag = 'span',
}: TruncatedTextProps) {
  const strategy = truncationStrategyFor(kind);

  if (strategy === 'none') {
    return <Tag className={cn('whitespace-nowrap', className)}>{children}</Tag>;
  }

  if (kind === 'description') {
    return (
      <Tag
        className={cn(lines === 2 ? 'line-clamp-2' : 'line-clamp-1', className)}
        title={children}
      >
        {children}
      </Tag>
    );
  }

  if (strategy === 'middle' && children.length > 18) {
    const head = children.slice(0, 8);
    const tail = children.slice(-6);
    return (
      <Tag className={cn('whitespace-nowrap', className)} title={children}>
        {head}…{tail}
      </Tag>
    );
  }

  return (
    <Tag
      className={cn('truncate block max-w-full', className)}
      title={children}
    >
      {children}
    </Tag>
  );
}
