import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Clock, Timer, DollarSign, MoreHorizontal, Check } from 'lucide-react';
import { BlurredAmount } from '@/contexts/HideNumbersContext';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { formatTime12h } from '@/lib/schedule-utils';
import { formatMinutesToDuration } from '@/lib/formatDuration';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ServiceRowData {
  name: string;
  category: string | null;
  startTime: string;          // "HH:MM:SS"
  duration: number;           // minutes
  price: number | null;
  assignedStylist: { userId: string | null; name: string | null };
  requiresConsultation: boolean;
}

export interface StylistOption {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  photo_url?: string | null;
}

interface ServiceRowProps {
  service: ServiceRowData;
  stylistOptions: StylistOption[];
  readOnly?: boolean;
  onChangeTime?: (newStartHHMMSS: string) => void;
  onChangeDuration?: (newMinutes: number) => void;
  onChangePrice?: (newPrice: number) => void;
  onChangeStylist?: (userId: string, name: string) => void;
  onToggleRq?: (next: boolean) => void;
  onRemove?: () => void;
}

function parseHHMMSSToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minToHHMMSS(min: number): string {
  const h = Math.floor(min / 60).toString().padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}:00`;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[p.length - 1]?.[0] || '')).toUpperCase() || '?';
}

export function ServiceRow({
  service,
  stylistOptions,
  readOnly = false,
  onChangeTime,
  onChangeDuration,
  onChangePrice,
  onChangeStylist,
  onToggleRq,
  onRemove,
}: ServiceRowProps) {
  const { formatCurrency } = useFormatCurrency();

  // Time popover state
  const [timeOpen, setTimeOpen] = useState(false);
  const [timeDraft, setTimeDraft] = useState(service.startTime.slice(0, 5));

  // Duration popover state
  const [durOpen, setDurOpen] = useState(false);
  const [durDraft, setDurDraft] = useState(String(service.duration));

  // Price popover state
  const [priceOpen, setPriceOpen] = useState(false);
  const [priceDraft, setPriceDraft] = useState(service.price != null ? String(service.price) : '');

  // Stylist popover state
  const [stylistOpen, setStylistOpen] = useState(false);

  const stylistName = service.assignedStylist.name || 'Unassigned';

  const sortedStylists = useMemo(() => {
    return [...stylistOptions].sort((a, b) => {
      const an = a.display_name || a.full_name || '';
      const bn = b.display_name || b.full_name || '';
      return an.localeCompare(bn);
    });
  }, [stylistOptions]);

  const commitTime = () => {
    if (!timeDraft || !onChangeTime) { setTimeOpen(false); return; }
    onChangeTime(`${timeDraft}:00`);
    setTimeOpen(false);
  };
  const commitDuration = () => {
    const n = Math.max(5, Math.min(240, Math.round(Number(durDraft) / 5) * 5));
    if (Number.isFinite(n) && onChangeDuration) onChangeDuration(n);
    setDurOpen(false);
  };
  const commitPrice = () => {
    const n = Math.max(0, Math.min(2000, Number(priceDraft)));
    if (Number.isFinite(n) && onChangePrice) onChangePrice(n);
    setPriceOpen(false);
  };

  const ChipBtn = ({
    children, onClick, disabled, ariaLabel,
  }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; ariaLabel?: string }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || readOnly}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-1',
        'text-xs text-foreground/90 hover:bg-muted hover:border-border transition-colors',
        'disabled:opacity-60 disabled:cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center gap-2 py-2 group">
      {/* Time chip */}
      <Popover open={timeOpen} onOpenChange={setTimeOpen}>
        <PopoverTrigger asChild>
          <span className="shrink-0">
            <ChipBtn ariaLabel="Edit start time">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="tabular-nums">{formatTime12h(service.startTime)}</span>
            </ChipBtn>
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2">
            <Label className="text-xs">Start time</Label>
            <Input
              type="time"
              step={300}
              value={timeDraft}
              onChange={e => setTimeDraft(e.target.value)}
            />
            <Button size="sm" className="w-full" onClick={commitTime}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Duration chip */}
      <Popover open={durOpen} onOpenChange={setDurOpen}>
        <PopoverTrigger asChild>
          <span className="shrink-0">
            <ChipBtn ariaLabel="Edit duration">
              <Timer className="h-3 w-3 text-muted-foreground" />
              <span className="tabular-nums">{formatMinutesToDuration(service.duration)}</span>
            </ChipBtn>
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2">
            <Label className="text-xs">Duration (minutes)</Label>
            <Input
              type="number"
              min={5}
              max={240}
              step={5}
              value={durDraft}
              onChange={e => setDurDraft(e.target.value)}
            />
            <Button size="sm" className="w-full" onClick={commitDuration}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Service name + category + RQ */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm truncate">{service.name}</span>
        {service.category && (
          <Badge variant="outline" className="text-[10px] shrink-0">{service.category}</Badge>
        )}
        <label className="inline-flex items-center gap-1 shrink-0 cursor-pointer select-none">
          <Checkbox
            checked={service.requiresConsultation}
            onCheckedChange={(v) => onToggleRq?.(!!v)}
            disabled={readOnly}
            className="h-3.5 w-3.5"
          />
          <span className="text-[10px] text-muted-foreground tracking-wide">RQ</span>
        </label>
      </div>

      {/* Stylist chip */}
      <Popover open={stylistOpen} onOpenChange={setStylistOpen}>
        <PopoverTrigger asChild>
          <span className="shrink-0">
            <ChipBtn ariaLabel="Reassign stylist">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[7px]">{getInitials(stylistName)}</AvatarFallback>
              </Avatar>
              <span className="text-[11px] max-w-[90px] truncate">{stylistName}</span>
            </ChipBtn>
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="end">
          <Command>
            <CommandInput placeholder="Find stylist..." />
            <CommandList>
              <CommandEmpty>No stylist found.</CommandEmpty>
              <CommandGroup>
                {sortedStylists.map(s => {
                  const display = s.display_name || s.full_name || 'Unknown';
                  const selected = s.user_id === service.assignedStylist.userId;
                  return (
                    <CommandItem
                      key={s.user_id}
                      value={display}
                      onSelect={() => {
                        onChangeStylist?.(s.user_id, display);
                        setStylistOpen(false);
                      }}
                    >
                      <Avatar className="h-5 w-5 mr-2">
                        {s.photo_url ? <AvatarImage src={s.photo_url} alt={display} /> : null}
                        <AvatarFallback className="text-[8px]">{getInitials(display)}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{display}</span>
                      {selected && <Check className="h-3.5 w-3.5 text-primary ml-2" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Price chip */}
      <Popover open={priceOpen} onOpenChange={setPriceOpen}>
        <PopoverTrigger asChild>
          <span className="shrink-0">
            <ChipBtn ariaLabel="Edit price">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="tabular-nums">
                <BlurredAmount>
                  {service.price != null ? formatCurrency(service.price) : '—'}
                </BlurredAmount>
              </span>
            </ChipBtn>
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="end">
          <div className="space-y-2">
            <Label className="text-xs">Price</Label>
            <Input
              type="number"
              min={0}
              max={2000}
              step={1}
              value={priceDraft}
              onChange={e => setPriceDraft(e.target.value)}
            />
            <Button size="sm" className="w-full" onClick={commitPrice}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Overflow menu */}
      {!readOnly && onRemove && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRemove} className="text-destructive">
              Remove service
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export { parseHHMMSSToMin, minToHHMMSS };
