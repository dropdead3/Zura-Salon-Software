import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { usePOSConfig } from '@/hooks/usePOSData';
import { format } from 'date-fns';
import { useOrgDefaults } from '@/hooks/useOrgDefaults';
import { useNavigate } from 'react-router-dom';
import { tokens } from '@/lib/design-tokens';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CalendarIcon, Check, ChevronsUpDown, Loader2, UserPlus } from 'lucide-react';
import { cn, formatDisplayName } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocations } from '@/hooks/useLocations';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { useDuplicateDetection } from '@/hooks/useDuplicateDetection';
import { useDebounce } from '@/hooks/use-debounce';
import { DuplicateDetectionModal } from '@/components/dashboard/clients/DuplicateDetectionModal';


interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client: {
    id: string;
    phorest_client_id: string;
    name: string;
    email: string | null;
    phone: string | null;
  }) => void;
  defaultLocationId?: string;
}

export function NewClientDialog({
  open,
  onOpenChange,
  onClientCreated,
  defaultLocationId,
}: NewClientDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { effectiveOrganization } = useOrganizationContext();
  const { data: locations = [] } = useLocations();
  const { data: allTeamMembers } = useTeamDirectory();
  const SERVICE_PROVIDER_ROLES = ['stylist', 'stylist_assistant', 'booth_renter'];
  const teamMembers = allTeamMembers?.filter(m => m.roles?.some((r: string) => SERVICE_PROVIDER_ROLES.includes(r)));
  const bypassDuplicateCheck = useRef(false);
  const { data: posConfig } = usePOSConfig();

  const clientDescription = useMemo(() => {
    const base = 'Create a new client in the system.';
    if (posConfig?.posType && posConfig.syncEnabled) {
      const name = posConfig.posType.charAt(0).toUpperCase() + posConfig.posType.slice(1);
      return `${base} They will be synced to ${name}.`;
    }
    return base;
  }, [posConfig?.posType, posConfig?.syncEnabled]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Female');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [birthday, setBirthday] = useState<Date | undefined>(undefined);
  const [birthdayInput, setBirthdayInput] = useState('');

  const { locale } = useOrgDefaults();
  const isMonthFirst = locale === 'en' || locale === 'en-US';
  const birthdayPlaceholder = isMonthFirst ? 'MM/DD/YYYY' : 'DD/MM/YYYY';

  const handleBirthdayInput = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 2 || i === 4) formatted += '/';
      formatted += digits[i];
    }
    setBirthdayInput(formatted);

    if (digits.length === 8) {
      const p1 = parseInt(digits.slice(0, 2), 10);
      const p2 = parseInt(digits.slice(2, 4), 10);
      const year = parseInt(digits.slice(4, 8), 10);
      const month = isMonthFirst ? p1 : p2;
      const day = isMonthFirst ? p2 : p1;
      const now = new Date();
      const minYear = now.getFullYear() - 100;
      if (month >= 1 && month <= 12 && day >= 1 && year >= minYear && year <= now.getFullYear()) {
        const date = new Date(year, month - 1, day);
        if (date.getMonth() === month - 1 && date.getDate() === day && date <= now) {
          setBirthday(date);
          return;
        }
      }
    }
    setBirthday(undefined);
  }, [isMonthFirst]);
  const [clientSince, setClientSince] = useState<Date | undefined>(new Date());
  const [locationId, setLocationId] = useState(defaultLocationId || '');
  const [showLocationSelector, setShowLocationSelector] = useState(!defaultLocationId);

  // Sync locationId when defaultLocationId changes (e.g. scheduler location toggle)
  useEffect(() => {
    if (defaultLocationId) {
      setLocationId(defaultLocationId);
      setShowLocationSelector(false);
    }
  }, [defaultLocationId]);

  // Auto-select first location when none is set
  useEffect(() => {
    if (!locationId && locations.length > 0) {
      setLocationId(locations[0].id);
    }
  }, [locations, locationId]);

  const [preferredStylistId, setPreferredStylistId] = useState('');
  const [stylistPickerOpen, setStylistPickerOpen] = useState(false);
  const [showAllStylists, setShowAllStylists] = useState(false);
  const [stylistAutoCleared, setStylistAutoCleared] = useState(false);

  // Stylist works at a location if their primary location_id matches OR
  // they have a schedule entry for that location.
  const stylistWorksAtLocation = useCallback(
    (member: any, locId: string) => {
      if (!locId) return true;
      if (member.location_id === locId) return true;
      const schedules = member.location_schedules || {};
      return Object.prototype.hasOwnProperty.call(schedules, locId);
    },
    [],
  );

  const locationFilteredStylists = useMemo(() => {
    if (!teamMembers) return [];
    if (!locationId || showAllStylists) return teamMembers;
    return teamMembers.filter(m => stylistWorksAtLocation(m, locationId));
  }, [teamMembers, locationId, showAllStylists, stylistWorksAtLocation]);

  // When preferred location changes, clear preferred stylist if they don't work there.
  useEffect(() => {
    if (!preferredStylistId || preferredStylistId === 'none' || !locationId) {
      setStylistAutoCleared(false);
      return;
    }
    const selected = teamMembers?.find(m => m.user_id === preferredStylistId);
    if (selected && !stylistWorksAtLocation(selected, locationId)) {
      setPreferredStylistId('');
      setStylistAutoCleared(true);
      setShowAllStylists(false);
    }
  }, [locationId, preferredStylistId, teamMembers, stylistWorksAtLocation]);

  const debouncedEmail = useDebounce(email.trim(), 500);
  const debouncedPhone = useDebounce(phone.replace(/\D/g, ''), 500);
  const { data: duplicates = [] } = useDuplicateDetection(
    debouncedEmail || null,
    debouncedPhone || null
  );

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setGender('Female');
    setEmail('');
    setPhone('');
    setNotes('');
    setBirthday(undefined);
    setBirthdayInput('');
    setClientSince(new Date());
    setLocationId(defaultLocationId || '');
    setPreferredStylistId('');
    setShowAllStylists(false);
    setStylistAutoCleared(false);
    setStylistPickerOpen(false);
  };

  const createClient = useMutation({
    mutationFn: async () => {
      const location = locations.find(l => l.id === locationId);
      if (!locationId || !location) {
        throw new Error('Please select a location');
      }

      // If the location has a phorest_branch_id, use the Phorest edge function
      if (location.phorest_branch_id) {
        const response = await supabase.functions.invoke('create-phorest-client', {
          body: {
            branch_id: location.phorest_branch_id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            gender: gender || undefined,
            email: email.trim() || undefined,
            phone: phone.replace(/\D/g, '').trim() || undefined,
            notes: notes.trim() || undefined,
            birthday: birthday ? format(birthday, 'yyyy-MM-dd') : undefined,
            client_since: clientSince ? format(clientSince, 'yyyy-MM-dd') : undefined,
            preferred_stylist_id: preferredStylistId && preferredStylistId !== 'none' ? preferredStylistId : undefined,
          },
        });

        if (response.error) throw response.error;
        if (!response.data?.success) throw new Error(response.data?.error || 'Failed to create client');

        return response.data.client;
      }

      // Fallback: create client directly in the local clients table
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          gender: gender || null,
          email: email.trim() || null,
          mobile: phone.replace(/\D/g, '').trim() || null,
          notes: notes.trim() || null,
          birthday: birthday ? format(birthday, 'yyyy-MM-dd') : null,
          client_since: clientSince ? format(clientSince, 'yyyy-MM-dd') : null,
          preferred_stylist_id: preferredStylistId && preferredStylistId !== 'none' ? preferredStylistId : null,
          location_id: locationId,
          organization_id: effectiveOrganization?.id || null,
          import_source: 'manual',
          status: 'active',
        })
        .select('id, first_name, last_name, email, mobile, phorest_client_id')
        .single();

      if (error) throw error;

      return {
        id: newClient.id,
        phorest_client_id: newClient.phorest_client_id || '',
        name: `${newClient.first_name} ${newClient.last_name}`,
        email: newClient.email,
        phone: newClient.mobile,
      };
    },
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ['phorest-clients'] });
      toast.success('Client created successfully!');
      onClientCreated(client);
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to create client', { description: error.message });
    },
  });

  const canSubmit = firstName.trim() && lastName.trim() && (email.trim() || phone.trim()) && locationId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (duplicates.length > 0 && !bypassDuplicateCheck.current) {
      setShowDuplicateModal(true);
      return;
    }

    bypassDuplicateCheck.current = false;
    createClient.mutate();
  };

  const handleCreateAnyway = () => {
    setShowDuplicateModal(false);
    bypassDuplicateCheck.current = true;
    createClient.mutate();
  };

  const handleOpenExisting = (clientId: string) => {
    setShowDuplicateModal(false);
    onOpenChange(false);
    navigate(`/dashboard/clients/${clientId}`);
  };

  const handleStartMerge = (clientId: string) => {
    setShowDuplicateModal(false);
    onOpenChange(false);
    navigate(`/dashboard/admin/merge-clients?preselect=${clientId}`);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New Client
          </DialogTitle>
         <DialogDescription>
            {clientDescription}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 min-h-0 px-1 py-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <div className="flex flex-wrap gap-2">
              {['Female', 'Male', 'Non-Binary', 'Prefer not to say'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGender(gender === option ? '' : option)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-sans border transition-colors cursor-pointer",
                    gender === option
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-input hover:bg-accent/50"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {defaultLocationId && !showLocationSelector ? (
            <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Preferred Location: </span>
                <span className="font-medium">
                  {(() => {
                    const loc = locations.find(l => l.id === locationId);
                    if (!loc) return 'Selected location';
                    const parts = [loc.name, loc.address, loc.city].filter(Boolean);
                    return loc.address ? `${loc.name} — ${[loc.address, loc.city].filter(Boolean).join(', ')}` : loc.name;
                  })()}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size={tokens.button.inline}
                className="h-auto px-2 py-1 text-xs"
                onClick={() => setShowLocationSelector(true)}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="location">Preferred Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select preferred location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => {
                    const fullLabel = loc.address
                      ? `${loc.name} — ${[loc.address, loc.city].filter(Boolean).join(', ')}`
                      : loc.name;
                    return (
                      <SelectItem key={loc.id} value={loc.id}>
                        {fullLabel}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            * Email or phone is required for contact
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Birthday</Label>
              <Input
                value={birthdayInput}
                onChange={(e) => handleBirthdayInput(e.target.value)}
                placeholder={birthdayPlaceholder}
                inputMode="numeric"
                autoCapitalize="off"
              />
            </div>
            <div className="space-y-2">
              <Label>Client Since</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !clientSince && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {clientSince ? format(clientSince, "MMM d, yyyy") : "Optional"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[80]" align="start">
                  <Calendar
                    mode="single"
                    selected={clientSince}
                    onSelect={setClientSince}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred Stylist</Label>
            {(() => {
              const selectedMember = teamMembers?.find(m => m.user_id === preferredStylistId);
              const selectedName = selectedMember
                ? formatDisplayName(selectedMember.full_name || '', selectedMember.display_name)
                : '';
              const selectedInitials = selectedName
                .split(/\s+/)
                .filter(Boolean)
                .map(p => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || '?';

              return (
                <Popover open={stylistPickerOpen} onOpenChange={setStylistPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={stylistPickerOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedMember ? (
                        <span className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-5 w-5 shrink-0">
                            {selectedMember.photo_url && (
                              <AvatarImage src={selectedMember.photo_url} alt={selectedName} />
                            )}
                            <AvatarFallback className="text-[9px] bg-muted">
                              {selectedInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{selectedName}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None (optional)</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0 z-[80]"
                    align="start"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                  >
                    <Command
                      filter={(value, search) => {
                        if (!search) return 1;
                        return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                      }}
                    >
                      <CommandInput placeholder="Search stylists..." />
                      <CommandList className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain">
                        <CommandEmpty>
                          <div className="py-3 px-3 text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                              {locationId && !showAllStylists
                                ? 'No stylists at this location'
                                : 'No stylists found'}
                            </p>
                            {locationId && !showAllStylists && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setShowAllStylists(true)}
                              >
                                Show all stylists
                              </Button>
                            )}
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setPreferredStylistId('');
                              setStylistAutoCleared(false);
                              setStylistPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                !preferredStylistId ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <span className="text-muted-foreground">None</span>
                          </CommandItem>
                          {locationFilteredStylists.length === 0 && teamMembers && teamMembers.length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                              No service providers in system yet
                            </div>
                          )}
                          {locationFilteredStylists.map(member => {
                            const name = formatDisplayName(member.full_name || '', member.display_name);
                            const initials = name
                              .split(/\s+/)
                              .filter(Boolean)
                              .map(p => p[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase() || '?';
                            return (
                              <CommandItem
                                key={member.user_id}
                                value={`${name} ${member.full_name || ''}`}
                                onSelect={() => {
                                  setPreferredStylistId(member.user_id);
                                  setStylistAutoCleared(false);
                                  setStylistPickerOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    preferredStylistId === member.user_id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <Avatar className="h-6 w-6 shrink-0 mr-2">
                                  {member.photo_url && <AvatarImage src={member.photo_url} alt={name} />}
                                  <AvatarFallback className="text-[10px] bg-muted">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate">{name}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                      {locationId && !showAllStylists && locationFilteredStylists.length > 0 && (
                        <div className="border-t px-2 py-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full h-7 text-xs justify-center text-muted-foreground"
                            onClick={() => setShowAllStylists(true)}
                          >
                            Show all stylists
                          </Button>
                        </div>
                      )}
                    </Command>
                  </PopoverContent>
                </Popover>
              );
            })()}
            {stylistAutoCleared && (
              <p className="text-xs text-muted-foreground">
                Cleared — previous stylist isn't at this location.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special notes about this client..."
              rows={3}
            />
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!canSubmit || createClient.isPending}
          >
            {createClient.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Client
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <DuplicateDetectionModal
      open={showDuplicateModal}
      onOpenChange={setShowDuplicateModal}
      duplicates={duplicates}
      onOpenExisting={handleOpenExisting}
      onStartMerge={handleStartMerge}
      onCreateAnyway={handleCreateAnyway}
    />
    </>
  );
}
