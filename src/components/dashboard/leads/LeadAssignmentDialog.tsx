import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus, MapPin, Sparkles } from 'lucide-react';
import { LeadWithAssignee } from '@/hooks/useLeadInbox';
import { cn } from '@/lib/utils';

interface Stylist {
  user_id: string;
  full_name: string;
  stylist_level: string | null;
  location_id: string | null;
}

interface LeadAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadWithAssignee | null;
  stylists: Stylist[];
  locations: Map<string, string>;
  onAssign: (leadId: string, stylistId: string) => Promise<void>;
  isAssigning: boolean;
}

export function LeadAssignmentDialog({
  open,
  onOpenChange,
  lead,
  stylists,
  locations,
  onAssign,
  isAssigning,
}: LeadAssignmentDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);

  // Filter and sort stylists
  const filteredStylists = useMemo(() => {
    let result = stylists;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.full_name.toLowerCase().includes(query)
      );
    }

    // Sort: preferred location first, then by level
    if (lead?.preferred_location) {
      result = [...result].sort((a, b) => {
        const aMatch = a.location_id === lead.preferred_location ? 1 : 0;
        const bMatch = b.location_id === lead.preferred_location ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    return result;
  }, [stylists, searchQuery, lead?.preferred_location]);

  const handleAssign = async () => {
    if (!lead || !selectedStylistId) return;
    await onAssign(lead.id, selectedStylistId);
    setSelectedStylistId(null);
    setSearchQuery('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedStylistId(null);
    setSearchQuery('');
    onOpenChange(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getLevelColor = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case 'master': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'senior': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'stylist': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'junior': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Assign Lead
          </DialogTitle>
          <DialogDescription>
            Select a stylist to assign this lead to
          </DialogDescription>
        </DialogHeader>

        {lead && (
          <div className="p-3 bg-muted/30 rounded-lg mb-4">
            <p className="font-medium">{lead.name}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              {lead.preferred_location_name && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {lead.preferred_location_name}
                </span>
              )}
              {lead.preferred_service && (
                <span>• {lead.preferred_service}</span>
              )}
            </div>
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search stylists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-2">
            {filteredStylists.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No stylists found
              </p>
            ) : (
              filteredStylists.map((stylist) => {
                const isPreferredLocation = 
                  lead?.preferred_location && 
                  stylist.location_id === lead.preferred_location;
                
                return (
                  <button
                    key={stylist.user_id}
                    onClick={() => setSelectedStylistId(stylist.user_id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                      selectedStylistId === stylist.user_id
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(stylist.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{stylist.full_name}</span>
                        {isPreferredLocation && (
                          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {stylist.stylist_level && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getLevelColor(stylist.stylist_level))}
                          >
                            {stylist.stylist_level}
                          </Badge>
                        )}
                        {stylist.location_id && locations.has(stylist.location_id) && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {locations.get(stylist.location_id)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors",
                      selectedStylistId === stylist.user_id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    )}>
                      {selectedStylistId === stylist.user_id && (
                        <svg viewBox="0 0 20 20" className="w-full h-full text-primary-foreground">
                          <path
                            fill="currentColor"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={!selectedStylistId || isAssigning}
          >
            {isAssigning ? 'Assigning...' : 'Assign Lead'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
