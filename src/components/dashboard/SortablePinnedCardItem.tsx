import type { CSSProperties, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Switch } from '@/components/ui/switch';
import { GripVertical, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import { AnalyticsCardPreview } from './previews/AnalyticsCardPreview';
import { CARD_QUESTIONS, type CardQuestionId } from './analytics/cardQuestions';
import { CARD_DESCRIPTIONS } from './analytics/cardDescriptions';

interface SortablePinnedCardItemProps {
  id: string;
  cardId?: string;
  label: string;
  icon: ReactNode;
  isPinned: boolean;
  onToggle: () => void;
  isLoading?: boolean;
  sortable?: boolean;
  /**
   * 1-indexed position within the visible pinned-cards list. When provided
   * and <= 6, the row is marked as "in Simple view" (primary ordinal chip +
   * left accent). Positions > 6 are dimmed (Detailed view only).
   */
  simpleViewIndex?: number;
}

interface PinnedCardItemRowProps extends SortablePinnedCardItemProps {
  rawCardId: string;
  style?: CSSProperties;
  setNodeRef?: (node: HTMLElement | null) => void;
  dragAttributes?: Record<string, any>;
  dragListeners?: Record<string, any>;
  isDragging?: boolean;
}

function PinnedCardItemRow({
  label,
  icon,
  isPinned,
  onToggle,
  isLoading = false,
  sortable = true,
  rawCardId,
  style,
  setNodeRef,
  dragAttributes,
  dragListeners,
  isDragging = false,
}: PinnedCardItemRowProps) {
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg transition-colors',
        isPinned ? 'bg-muted/50' : 'bg-transparent opacity-60',
        isDragging && 'opacity-50 shadow-lg z-50 bg-background'
      )}
    >
      <button
        {...(sortable ? dragAttributes : {})}
        {...(sortable ? dragListeners : {})}
        className="touch-none mr-2 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
        type="button"
        disabled={!sortable || !isPinned}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3 flex-1">
        <div className="text-muted-foreground">
          {icon}
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>

      <HoverCardPrimitive.Root openDelay={200} closeDelay={100}>
        <HoverCardPrimitive.Trigger asChild>
          <button
            type="button"
            className="p-1 mr-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </HoverCardPrimitive.Trigger>
        <HoverCardPrimitive.Portal>
          <HoverCardPrimitive.Content
            side="left"
            align="start"
            sideOffset={16}
            className={cn(
              'z-[60] w-[340px] p-3 rounded-xl border bg-popover text-popover-foreground shadow-xl space-y-2',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            )}
          >
            {/* Doctrine teaching slot: question (what it answers) → description (how) → preview. */}
            {CARD_QUESTIONS[rawCardId as CardQuestionId] && (
              <p className="text-[10px] font-display tracking-wider uppercase text-muted-foreground/80 leading-snug">
                {CARD_QUESTIONS[rawCardId as CardQuestionId]}
              </p>
            )}
            {CARD_DESCRIPTIONS[rawCardId] && (
              <p className="text-xs font-sans text-foreground/80 leading-snug">
                {CARD_DESCRIPTIONS[rawCardId]}
              </p>
            )}
            <AnalyticsCardPreview cardId={rawCardId} />
            <p className="text-[10px] text-muted-foreground text-center">
              Preview with example data
            </p>
          </HoverCardPrimitive.Content>
        </HoverCardPrimitive.Portal>
      </HoverCardPrimitive.Root>

      <Switch
        checked={isPinned}
        onCheckedChange={onToggle}
        disabled={isLoading}
      />
    </div>
  );
}

export function SortablePinnedCardItem({
  id,
  cardId,
  label,
  icon,
  isPinned,
  onToggle,
  isLoading = false,
  sortable = true,
}: SortablePinnedCardItemProps) {
  const rawCardId = cardId || id;

  if (!sortable) {
    return (
      <PinnedCardItemRow
        id={id}
        cardId={cardId}
        label={label}
        icon={icon}
        isPinned={isPinned}
        onToggle={onToggle}
        isLoading={isLoading}
        sortable={false}
        rawCardId={rawCardId}
      />
    );
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <PinnedCardItemRow
      id={id}
      cardId={cardId}
      label={label}
      icon={icon}
      isPinned={isPinned}
      onToggle={onToggle}
      isLoading={isLoading}
      sortable
      rawCardId={rawCardId}
      style={style}
      setNodeRef={setNodeRef}
      dragAttributes={attributes}
      dragListeners={listeners}
      isDragging={isDragging}
    />
  );
}
