import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DollarSign, Pin, Loader2, MessageSquare, Send, X, Pencil, Trash2, MoreVertical, MapPin, Star } from 'lucide-react';
import { HighFiveButton } from './HighFiveButton';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';

interface HighFiveUser {
  id: string;
  user_id: string;
  user_name?: string;
  user_photo?: string | null;
}

interface BellEntry {
  id: string;
  service_booked: string;
  ticket_value: number;
  lead_source: string;
  closing_script: string | null;
  coach_note: string | null;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
  stylist_name?: string;
  stylist_photo?: string | null;
  stylist_locations?: string[];
}

const leadSources = [
  { value: 'salon_lead', label: 'Salon Lead Passed to Me' },
  { value: 'content', label: 'Content (Organic)' },
  { value: 'ads', label: 'Paid Ads' },
  { value: 'referral', label: 'Referral' },
  { value: 'google', label: 'Google Search' },
  { value: 'walkin', label: 'Walk-in' },
  { value: 'other', label: 'Other' },
];

interface BellEntryCardProps {
  entry: BellEntry;
  isCoach: boolean;
  canEditOrDelete: boolean;
  showStylistName?: boolean;
  highFiveCount: number;
  hasUserHighFived: boolean;
  highFiveUsers: HighFiveUser[];
  activeLocationFilter?: string | null;
  onTogglePin: (entryId: string, currentlyPinned: boolean) => void;
  onSaveNote: (entryId: string, noteText: string) => Promise<void>;
  onSaveEdit: (entryId: string, data: { service: string; ticketValue: string; leadSource: string; closingScript: string }) => Promise<void>;
  onDelete: (entry: BellEntry) => void;
  onToggleHighFive: (entryId: string, entryOwnerId: string) => void;
  onLocationClick?: (location: string) => void;
}

export function BellEntryCard({
  entry,
  isCoach,
  canEditOrDelete,
  showStylistName = true,
  highFiveCount,
  hasUserHighFived,
  highFiveUsers,
  activeLocationFilter,
  onTogglePin,
  onSaveNote,
  onSaveEdit,
  onDelete,
  onToggleHighFive,
  onLocationClick,
}: BellEntryCardProps) {
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  // Edit entry state
  const [isEditing, setIsEditing] = useState(false);
  const [editService, setEditService] = useState('');
  const [editTicketValue, setEditTicketValue] = useState('');
  const [editLeadSource, setEditLeadSource] = useState('');
  const [editClosingScript, setEditClosingScript] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Coach note state
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const startEditing = () => {
    setIsEditing(true);
    setEditService(entry.service_booked);
    setEditTicketValue(entry.ticket_value.toString());
    setEditLeadSource(entry.lead_source);
    setEditClosingScript(entry.closing_script || '');
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditService('');
    setEditTicketValue('');
    setEditLeadSource('');
    setEditClosingScript('');
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    await onSaveEdit(entry.id, {
      service: editService,
      ticketValue: editTicketValue,
      leadSource: editLeadSource,
      closingScript: editClosingScript,
    });
    setSavingEdit(false);
    setIsEditing(false);
  };

  const startEditingNote = () => {
    setIsEditingNote(true);
    setNoteText(entry.coach_note || '');
  };

  const cancelEditingNote = () => {
    setIsEditingNote(false);
    setNoteText('');
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    await onSaveNote(entry.id, noteText);
    setSavingNote(false);
    setIsEditingNote(false);
  };

  return (
    <Card className={`p-6 ${entry.is_pinned ? 'border-primary bg-primary/5' : ''}`}>
      {isEditing ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Service Booked</Label>
              <Input
                value={editService}
                onChange={(e) => setEditService(e.target.value)}
                placeholder="e.g., Full Extensions Install"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Ticket Value</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={editTicketValue}
                  onChange={(e) => setEditTicketValue(e.target.value)}
                  className="pl-9"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">Lead Source</Label>
            <Select value={editLeadSource} onValueChange={setEditLeadSource}>
              <SelectTrigger>
                <SelectValue placeholder="How did they find you?" />
              </SelectTrigger>
              <SelectContent>
                {leadSources.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider">What Closed the Deal? (Optional)</Label>
            <Textarea
              value={editClosingScript}
              onChange={(e) => setEditClosingScript(e.target.value)}
              placeholder="Share the script, phrase, or action that sealed it..."
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="font-display text-xs"
            >
              {savingEdit ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Send className="w-3 h-3 mr-1" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={cancelEditing}
              className="font-display text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Avatar - always show */}
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={entry.stylist_photo || undefined} alt={entry.stylist_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-display text-sm">
                {entry.stylist_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                {entry.stylist_name && (
                  <span className="font-medium font-sans text-sm">
                    {showStylistName ? entry.stylist_name : 'You'}
                  </span>
                )}
                {entry.stylist_locations && entry.stylist_locations.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground font-sans">
                    <MapPin className="w-3 h-3" />
                    {entry.stylist_locations.slice(0, 2).map((loc, idx) => (
                      <button
                        key={loc}
                        onClick={() => onLocationClick?.(loc)}
                        className={`hover:text-primary hover:underline transition-colors ${
                          activeLocationFilter === loc ? 'text-primary font-medium' : ''
                        }`}
                      >
                        {loc}{idx < Math.min(entry.stylist_locations!.length, 2) - 1 ? ',' : ''}
                      </button>
                    ))}
                    {entry.stylist_locations.length > 2 && (
                      <span className="text-muted-foreground">+{entry.stylist_locations.length - 2}</span>
                    )}
                  </span>
                )}
                {entry.is_pinned && (
                  <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-display tracking-wide rounded">
                    PINNED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-display text-xl">
                  {formatCurrencyWhole(entry.ticket_value)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="font-sans text-sm text-foreground">{entry.service_booked}</span>
              </div>
              <p className="text-xs text-muted-foreground font-sans">
                {leadSources.find(s => s.value === entry.lead_source)?.label} · {' '}
                {formatDate(new Date(entry.created_at), 'MMM d, yyyy')}
              </p>
              {entry.closing_script && (
                <p className="mt-3 text-sm text-muted-foreground font-sans italic">
                  "{entry.closing_script}"
                </p>
              )}

              {/* Coach Note Display */}
              {entry.coach_note && !isEditingNote && (
                <div className="mt-4 p-3 bg-accent/50 rounded-lg border border-accent">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Coach Note
                  </p>
                  <p className="text-sm font-sans">{entry.coach_note}</p>
                </div>
              )}

              {/* Coach Note Editor */}
              {isCoach && isEditingNote && (
                <div className="mt-4 space-y-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a celebratory note for this win..."
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={savingNote}
                      className="font-display text-xs"
                    >
                      {savingNote ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3 h-3 mr-1" />
                          Save Note
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEditingNote}
                      className="font-display text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* High Five Button */}
              <div className="mt-4">
                <HighFiveButton
                  count={highFiveCount}
                  hasHighFived={hasUserHighFived}
                  users={highFiveUsers}
                  onToggle={() => onToggleHighFive(entry.id, entry.user_id)}
                />
              </div>
            </div>
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Salon Lead Badge */}
            {entry.lead_source === 'salon_lead' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-display tracking-wide rounded text-primary-foreground shadow-sm bg-[linear-gradient(110deg,hsl(var(--primary))_40%,hsl(var(--primary)/0.6)_50%,hsl(var(--primary))_60%)] bg-[length:200%_100%] animate-shimmer">
                <Star className="w-3 h-3 fill-current" />
                SALON LEAD
              </span>
            )}

            {/* Actions Menu */}
            {(isCoach || canEditOrDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Coach-only actions */}
                {isCoach && (
                  <>
                    <DropdownMenuItem onClick={() => onTogglePin(entry.id, entry.is_pinned)}>
                      <Pin className={`w-4 h-4 mr-2 ${entry.is_pinned ? 'text-primary' : ''}`} />
                      {entry.is_pinned ? 'Unpin' : 'Pin to Top'}
                    </DropdownMenuItem>
                    {!isEditingNote && (
                      <DropdownMenuItem onClick={startEditingNote}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {entry.coach_note ? 'Edit Note' : 'Add Note'}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {/* Edit/Delete for owner or coach */}
                {canEditOrDelete && (
                  <>
                    <DropdownMenuItem onClick={startEditing}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Entry
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(entry)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Entry
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}