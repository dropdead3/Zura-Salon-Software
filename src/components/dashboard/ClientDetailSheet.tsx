import { useState } from 'react';
import { useClientHousehold } from '@/hooks/useHouseholds';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { useFormatDate } from '@/hooks/useFormatDate';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Star, 
  AlertTriangle, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin,
  MessageSquare,
  Clock,
  TrendingUp,
  DollarSign,
  Cake,
  Award,
  Pencil,
  X,
  Check,
  Loader2,
  Archive,
  Settings,
  Bell,
  Home,
  StickyNote,
  Megaphone,
  GitMerge,
  Users,
  Beaker,
  ExternalLink,
  Receipt,
  Camera
} from 'lucide-react';
import { tokens } from '@/lib/design-tokens';
import { cn, formatPhoneDisplay, formatName } from '@/lib/utils';
import { calculateCLV, assignCLVTier, CLV_TIERS, type CLVTierConfig } from '@/lib/clv-calculator';
import { LEAD_SOURCES, getLeadSourceLabel, getLeadSourceColor, isStandardSource } from '@/lib/leadSources';
import { MergedProfileBanner } from './clients/merge/MergedProfileBanner';
import { VisitHistoryTimeline } from './VisitHistoryTimeline';
import { usePreferredStylist, getStylistDisplayName } from '@/hooks/usePreferredStylist';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import { ClientNotesSection } from './ClientNotesSection';
import { useClientVisitHistory } from '@/hooks/useClientVisitHistory';
import { TransformationTimeline } from './clients/TransformationTimeline';
import { BannedClientAlert } from './clients/BannedClientAlert';
import { BannedClientBadge } from './clients/BannedClientBadge';
import { BanClientToggle } from './clients/BanClientToggle';
import { ClientRedoHistory } from './clients/ClientRedoHistory';
import { ClientFormulaHistoryTab } from './clients/ClientFormulaHistoryTab';
import { ArchiveClientToggle } from './clients/ArchiveClientToggle';
import { ClientMarketingStatus } from './clients/ClientMarketingStatus';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useClientTransactionHistory } from '@/hooks/useClientTransactionHistory';
import { TransactionHistoryTimeline } from './TransactionHistoryTimeline';
import { ClientAffinityBadges } from './clients/ClientAffinityBadges';
import { toast } from 'sonner';

interface Client {
  id: string;
  phorest_client_id: string | null;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  gender?: string | null;
  email: string | null;
  phone: string | null;
  landline?: string | null;
  is_vip: boolean;
  visit_count: number;
  total_spend: number | null;
  last_visit: string | null;
  preferred_services: string[] | null;
  branch_name: string | null;
  location_id: string | null;
  isAtRisk?: boolean;
  isNew?: boolean;
  daysSinceVisit?: number | null;
  is_banned?: boolean;
  ban_reason?: string | null;
  birthday?: string | null;
  client_since?: string | null;
  is_archived?: boolean;
  reminder_email_opt_in?: boolean;
  reminder_sms_opt_in?: boolean;
  client_category?: string | null;
  lead_source?: string | null;
  referred_by?: string | null;
  external_client_id?: string | null;
  prompt_client_notes?: boolean;
  prompt_appointment_notes?: boolean;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  preferred_stylist_id?: string | null;
  is_duplicate?: boolean;
  canonical_client_id?: string | null;
}

interface ClientDetailSheetProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationName?: string;
  onClientUpdated?: (updates: Partial<Client>) => void;
}

export function ClientDetailSheet({ client, open, onOpenChange, locationName, onClientUpdated }: ClientDetailSheetProps) {
  const navigate = useNavigate();
  const { data: visitHistory, isLoading: historyLoading } = useClientVisitHistory(client?.phorest_client_id);
  const { data: transactionData, isLoading: transactionsLoading } = useClientTransactionHistory(client?.phorest_client_id);
  const { data: householdData } = useClientHousehold(client?.id);
  const { formatCurrencyWhole } = useFormatCurrency();
  const { formatDate } = useFormatDate();
  const { roles } = useAuth();
  const { selectedOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();

  const canMerge = roles.some(role => ['admin', 'manager', 'super_admin'].includes(role));

  // Contact edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLandline, setEditLandline] = useState('');

  // Dates edit mode state
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editBirthday, setEditBirthday] = useState('');
  const [editClientSince, setEditClientSince] = useState('');

  // Source edit mode state
  const [isEditingSource, setIsEditingSource] = useState(false);

  // Settings edit mode state
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editLeadSource, setEditLeadSource] = useState('');
  const [editLeadSourceCustom, setEditLeadSourceCustom] = useState('');
  const [editReferredBy, setEditReferredBy] = useState('');
  const [editExternalId, setEditExternalId] = useState('');
  const [editPreferredStylist, setEditPreferredStylist] = useState('');

  // Prompts edit mode state
  const [isEditingPrompts, setIsEditingPrompts] = useState(false);
  const [editPromptClientNotes, setEditPromptClientNotes] = useState(false);
  const [editPromptAppointmentNotes, setEditPromptAppointmentNotes] = useState(false);

  // Address edit mode state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddress1, setEditAddress1] = useState('');
  const [editAddress2, setEditAddress2] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editZip, setEditZip] = useState('');
  const [editCountry, setEditCountry] = useState('');

  // Reminders edit mode state
  const [isEditingReminders, setIsEditingReminders] = useState(false);
  const [editReminderEmail, setEditReminderEmail] = useState(true);
  const [editReminderSms, setEditReminderSms] = useState(true);
  
  const canEdit = roles.some(role => ['admin', 'manager', 'super_admin', 'receptionist'].includes(role));

  // Preferred stylist data
  const { data: preferredStylist } = usePreferredStylist(client?.preferred_stylist_id);
  const { data: allTeamMembers } = useTeamDirectory(undefined, { organizationId: selectedOrganization?.id });
  const SERVICE_PROVIDER_ROLES = ['stylist', 'stylist_assistant', 'booth_renter'];
  const teamMembers = allTeamMembers?.filter(m => m.roles?.some((r: string) => SERVICE_PROVIDER_ROLES.includes(r)));

  const startEditing = () => {
    if (!client) return;
    setEditFirstName(client.first_name || client.name?.split(' ')[0] || '');
    setEditLastName(client.last_name || client.name?.split(' ').slice(1).join(' ') || '');
    setEditGender(client.gender || '');
    setEditEmail(client.email || '');
    setEditPhone(client.phone || '');
    setEditLandline(client.landline || '');
    setIsEditing(true);
  };

  const startEditingDates = () => {
    if (!client) return;
    setEditBirthday(client.birthday || '');
    setEditClientSince(client.client_since || '');
    setIsEditingDates(true);
  };

  const startEditingSource = () => {
    if (!client) return;
    const currentSource = client.lead_source || '';
    if (isStandardSource(currentSource) || !currentSource) {
      setEditLeadSource(currentSource);
      setEditLeadSourceCustom('');
    } else {
      setEditLeadSource('other');
      setEditLeadSourceCustom(currentSource);
    }
    setEditReferredBy(client.referred_by || '');
    setIsEditingSource(true);
  };

  const startEditingSettings = () => {
    if (!client) return;
    setEditCategory(client.client_category || '');
    setEditExternalId(client.external_client_id || '');
    setEditPreferredStylist(client.preferred_stylist_id || 'none');
    setIsEditingSettings(true);
  };

  const startEditingPrompts = () => {
    if (!client) return;
    setEditPromptClientNotes(client.prompt_client_notes || false);
    setEditPromptAppointmentNotes(client.prompt_appointment_notes || false);
    setIsEditingPrompts(true);
  };

  const startEditingAddress = () => {
    if (!client) return;
    setEditAddress1(client.address_line1 || '');
    setEditAddress2(client.address_line2 || '');
    setEditCity(client.city || '');
    setEditState(client.state || '');
    setEditZip(client.zip || '');
    setEditCountry(client.country || '');
    setIsEditingAddress(true);
  };

  const startEditingReminders = () => {
    if (!client) return;
    setEditReminderEmail(client.reminder_email_opt_in !== false);
    setEditReminderSms(client.reminder_sms_opt_in !== false);
    setIsEditingReminders(true);
  };

  const cancelEditing = () => setIsEditing(false);
  const cancelEditingDates = () => setIsEditingDates(false);

  const updateClientCache = (updates: Record<string, any>) => {
    // Optimistically patch the client in all client-directory caches for instant UI
    queryClient.setQueriesData(
      { queryKey: ['client-directory'] },
      (old: any[] | undefined) => {
        if (!old || !client) return old;
        return old.map((c: any) => c.id === client.id ? { ...c, ...updates } : c);
      }
    );
    // Background refetch for consistency (non-blocking)
    queryClient.invalidateQueries({ queryKey: ['client-directory'] });
    queryClient.invalidateQueries({ queryKey: ['phorest-clients'] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error('No client');
      const fullName = `${editFirstName.trim()} ${editLastName.trim()}`.trim();
      
      const { error } = await supabase
        .from('phorest_clients')
        .update({
          first_name: editFirstName.trim() || null,
          last_name: editLastName.trim() || null,
          name: fullName,
          gender: editGender || null,
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          landline: editLandline.trim() || null,
        } as any)
        .eq('id', client.id);
      
      if (error) throw error;

      // Belt-and-suspenders: clear stale duplicate flag if contact no longer matches canonical
      if (client.is_duplicate && client.canonical_client_id) {
        const { data: canonical } = await supabase
          .from('phorest_clients')
          .select('email_normalized, phone_normalized')
          .eq('id', client.canonical_client_id)
          .maybeSingle();

        const newEmail = (editEmail.trim() || '').toLowerCase();
        const newPhone = editPhone.trim();
        const emailMatch = newEmail && canonical?.email_normalized === newEmail;
        const phoneMatch = newPhone && canonical?.phone_normalized === newPhone;

        if (!emailMatch && !phoneMatch) {
          await supabase
            .from('phorest_clients')
            .update({ is_duplicate: false, canonical_client_id: null } as any)
            .eq('id', client.id);
        }
      }
    },
    onSuccess: () => {
      const fullName = `${editFirstName.trim()} ${editLastName.trim()}`.trim();
      onClientUpdated?.({
        first_name: editFirstName.trim() || null,
        last_name: editLastName.trim() || null,
        name: fullName,
        gender: editGender || null,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        landline: editLandline.trim() || null,
      });
      updateClientCache({ first_name: editFirstName.trim() || null, last_name: editLastName.trim() || null, name: fullName, gender: editGender || null, email: editEmail.trim() || null, phone: editPhone.trim() || null, landline: editLandline.trim() || null });
      toast.success('Client info updated');
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to update client', { description: error.message });
    },
  });

  const saveDatesMutation = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error('No client');
      const { error } = await supabase
        .from('phorest_clients')
        .update({ birthday: editBirthday || null, client_since: editClientSince || null })
        .eq('id', client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onClientUpdated?.({ birthday: editBirthday || null, client_since: editClientSince || null });
      updateClientCache({ birthday: editBirthday || null, client_since: editClientSince || null }); toast.success('Dates updated'); setIsEditingDates(false);
    },
    onError: (error: Error) => { toast.error('Failed to update dates', { description: error.message }); },
  });

  const saveSourceMutation = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error('No client');
      const resolvedSource = editLeadSource === 'other' && editLeadSourceCustom.trim()
        ? editLeadSourceCustom.trim()
        : editLeadSource || null;
      const { error } = await supabase
        .from('phorest_clients')
        .update({
          lead_source: resolvedSource,
          referred_by: editReferredBy || null,
        } as any)
        .eq('id', client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      const resolvedSource = editLeadSource === 'other' && editLeadSourceCustom.trim()
        ? editLeadSourceCustom.trim()
        : editLeadSource || null;
      onClientUpdated?.({ lead_source: resolvedSource, referred_by: editReferredBy || null });
      updateClientCache({ lead_source: resolvedSource, referred_by: editReferredBy || null }); toast.success('Source updated'); setIsEditingSource(false);
    },
    onError: (error: Error) => { toast.error('Failed to update source', { description: error.message }); },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error('No client');
      const resolvedStylist = editPreferredStylist === 'none' ? null : editPreferredStylist || null;
      const { error } = await supabase
        .from('phorest_clients')
        .update({
          client_category: editCategory || null,
          external_client_id: editExternalId || null,
          preferred_stylist_id: resolvedStylist,
        } as any)
        .eq('id', client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      const resolvedStylist = editPreferredStylist === 'none' ? null : editPreferredStylist || null;
      onClientUpdated?.({ client_category: editCategory || null, external_client_id: editExternalId || null, preferred_stylist_id: resolvedStylist });
      updateClientCache({ client_category: editCategory || null, external_client_id: editExternalId || null, preferred_stylist_id: resolvedStylist }); toast.success('Settings updated'); setIsEditingSettings(false);
    },
    onError: (error: Error) => { toast.error('Failed to update settings', { description: error.message }); },
  });

  const savePromptsMutation = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error('No client');
      const { error } = await supabase
        .from('phorest_clients')
        .update({
          prompt_client_notes: editPromptClientNotes,
          prompt_appointment_notes: editPromptAppointmentNotes,
        } as any)
        .eq('id', client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onClientUpdated?.({ prompt_client_notes: editPromptClientNotes, prompt_appointment_notes: editPromptAppointmentNotes });
      updateClientCache({ prompt_client_notes: editPromptClientNotes, prompt_appointment_notes: editPromptAppointmentNotes }); toast.success('Prompts updated'); setIsEditingPrompts(false);
    },
    onError: (error: Error) => { toast.error('Failed to update prompts', { description: error.message }); },
  });

  const saveAddressMutation = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error('No client');
      const { error } = await supabase
        .from('phorest_clients')
        .update({
          address_line1: editAddress1 || null,
          address_line2: editAddress2 || null,
          city: editCity || null,
          state: editState || null,
          zip: editZip || null,
          country: editCountry || null,
        } as any)
        .eq('id', client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onClientUpdated?.({ address_line1: editAddress1 || null, address_line2: editAddress2 || null, city: editCity || null, state: editState || null, zip: editZip || null, country: editCountry || null });
      updateClientCache({ address_line1: editAddress1 || null, address_line2: editAddress2 || null, city: editCity || null, state: editState || null, zip: editZip || null, country: editCountry || null }); toast.success('Address updated'); setIsEditingAddress(false);
    },
    onError: (error: Error) => { toast.error('Failed to update address', { description: error.message }); },
  });

  const saveRemindersMutation = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error('No client');
      const { error } = await supabase
        .from('phorest_clients')
        .update({
          reminder_email_opt_in: editReminderEmail,
          reminder_sms_opt_in: editReminderSms,
        } as any)
        .eq('id', client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onClientUpdated?.({ reminder_email_opt_in: editReminderEmail, reminder_sms_opt_in: editReminderSms });
      updateClientCache({ reminder_email_opt_in: editReminderEmail, reminder_sms_opt_in: editReminderSms }); toast.success('Reminders updated'); setIsEditingReminders(false);
    },
    onError: (error: Error) => { toast.error('Failed to update reminders', { description: error.message }); },
  });

  if (!client) return null;

  const initials = client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const EditHeader = ({ title, icon: Icon, isEditMode, onStart, onCancel, onSave, isPending }: {
    title: string; icon: any; isEditMode: boolean; onStart: () => void; onCancel: () => void; onSave: () => void; isPending: boolean;
  }) => (
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-muted rounded-md flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <CardTitle className={tokens.heading.subsection}>{title}</CardTitle>
        </div>
        {canEdit && !isEditMode && (
          <Button variant="ghost" size="sm" onClick={onStart} className="h-7 px-2">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
        {isEditMode && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 px-2 text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onSave} disabled={isPending} className="h-7 px-2 text-primary">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </Button>
          </div>
        )}
      </div>
    </CardHeader>
  );

  const hasAddress = client.address_line1 || client.city || client.state || client.zip || client.country;

  const handleClose = () => {
    setIsEditing(false);
    setIsEditingDates(false);
    setIsEditingSource(false);
    setIsEditingSettings(false);
    setIsEditingPrompts(false);
    setIsEditingAddress(false);
    setIsEditingReminders(false);
    onOpenChange(false);
  };

  return (
    <PremiumFloatingPanel open={open} onOpenChange={onOpenChange}>
            <ScrollArea className="flex-1">
    <div className="p-6 space-y-4">
          {/* Merged Profile Banner */}
          {(client as any).status === 'merged' && (client as any).merged_into_client_id && (
            <MergedProfileBanner
              mergedIntoName="Primary Client"
              mergedAt={(client as any).merged_at || new Date().toISOString()}
              primaryClientId={(client as any).merged_into_client_id}
            />
          )}

          {/* Banned Client Alert */}
          {client.is_banned && (
            <div className="mb-0">
              <BannedClientAlert reason={client.ban_reason} />
            </div>
          )}

          {/* Archived Alert */}
          {client.is_archived && (
            <div className="p-3 rounded-xl bg-muted/60 border border-border/60 flex items-center gap-2">
              <Archive className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">This client is archived. Marketing is paused.</span>
            </div>
          )}

          {/* Header — Avatar + Name + Badges */}
          <div className="pb-0 border-0">
            <div className="flex items-center gap-4">
              <Avatar className={cn("w-16 h-16 border-2 border-border/40", client.is_archived && "opacity-50")}>
                <AvatarFallback className="font-display text-xl bg-primary/10 tracking-wide">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl tracking-wide flex items-center gap-2 flex-wrap uppercase">
                  {client.name}
                </h2>
                {(client as any).customer_number && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{(client as any).customer_number}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {client.is_banned && <BannedClientBadge size="md" />}
                  {client.is_archived && (
                    <Badge variant="secondary" className="text-xs">
                      <Archive className="w-3 h-3 mr-1" /> Archived
                    </Badge>
                  )}
                  {client.is_vip && !client.is_banned && !client.is_archived && (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                      <Star className="w-3 h-3 mr-1" /> VIP
                    </Badge>
                  )}
                  {client.isAtRisk && !client.is_banned && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" /> At Risk
                    </Badge>
                  )}
                  {client.isNew && !client.is_banned && (
                    <Badge variant="outline" className="text-xs border-green-500/40 text-green-600 dark:text-green-400">
                      New Client
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Quick Actions */}
          {(client.phone || client.email) ? (
            <div className="flex gap-2">
              {client.phone && (
                <Button variant="outline" size={tokens.button.card} asChild className="flex-1 rounded-xl border-border/60">
                  <a href={`tel:${client.phone}`}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </a>
                </Button>
              )}
              {client.email && (
                <Button variant="outline" size={tokens.button.card} asChild className="flex-1 rounded-xl border-border/60">
                  <a href={`mailto:${client.email}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </a>
                </Button>
              )}
              {client.phone && (
                <Button variant="outline" size={tokens.button.card} asChild className="flex-1 rounded-xl border-border/60">
                  <a href={`sms:${client.phone}`}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Text
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic text-center py-2">No contact info on file</p>
          )}

          {/* Stats Cards — Bento tiles */}
          {(() => {
            const clvResult = calculateCLV(
              client.total_spend,
              client.visit_count,
              (client as any).client_since || (client as any).first_visit || null,
              client.last_visit,
            );
            return (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 text-center bg-card/80 backdrop-blur-xl border-border/60">
                    <Calendar className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="font-display text-lg tracking-wide">{client.visit_count}</p>
                    <p className="text-xs text-muted-foreground">Visits</p>
                  </Card>
                  <Card className="p-3 text-center bg-card/80 backdrop-blur-xl border-border/60">
                    <TrendingUp className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className="font-display text-lg tracking-wide">{formatCurrencyWhole(client.total_spend || 0)}</p>
                    <p className="text-xs text-muted-foreground">Total Spend</p>
                  </Card>
                  <Card className="p-3 text-center bg-card/80 backdrop-blur-xl border-border/60">
                    <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                    <p className={cn(
                      "font-display text-lg tracking-wide",
                      client.daysSinceVisit && client.daysSinceVisit > 60 && "text-destructive",
                      client.daysSinceVisit && client.daysSinceVisit > 30 && client.daysSinceVisit <= 60 && "text-amber-600 dark:text-amber-400"
                    )}>
                      {client.daysSinceVisit !== null ? `${client.daysSinceVisit}d` : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">Since Visit</p>
                    {client.last_visit && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {formatDate(new Date(client.last_visit), 'MMM d, yyyy')}
                      </p>
                    )}
                  </Card>
                </div>

                {/* CLV Card */}
                {clvResult.isReliable && (
                  <Card className="p-3 bg-card/80 backdrop-blur-xl border-border/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-primary" />
                        </div>
                         <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">Lifetime Value</p>
                          <div className="flex items-center gap-2">
                            <p className="font-display text-xl tracking-wide">{formatCurrencyWhole(Math.round(clvResult.lifetimeValue))}</p>
                            {(() => {
                              // Simple tier assignment based on annual value thresholds
                              const tier = clvResult.annualValue >= 2000 ? CLV_TIERS.platinum
                                : clvResult.annualValue >= 1000 ? CLV_TIERS.gold
                                : clvResult.annualValue >= 500 ? CLV_TIERS.silver
                                : CLV_TIERS.bronze;
                              return (
                                <Badge className={cn("text-[10px] px-1.5 py-0", tier.color, tier.bgColor, "border-0")}>
                                  {tier.label}
                                </Badge>
                              );
                            })()}
                          </div>
                         </div>
                       </div>
                       <div className="text-right space-y-0.5">
                         <p className="text-xs text-muted-foreground">
                           {formatCurrencyWhole(Math.round(clvResult.annualValue))}<span className="text-muted-foreground/60">/yr</span>
                         </p>
                         <p className="text-xs text-muted-foreground">
                           {formatCurrencyWhole(Math.round(clvResult.avgTicket))}<span className="text-muted-foreground/60">/visit</span>
                         </p>
                         <p className="text-xs text-muted-foreground">
                           {clvResult.annualFrequency.toFixed(1)}<span className="text-muted-foreground/60"> visits/yr</span>
                         </p>
                       </div>
                    </div>
                  </Card>
                )}
              </motion.div>
            );
          })()}

          {/* Household Card */}
          {householdData && householdData.members.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <Card className="bg-card/80 backdrop-blur-xl border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-muted rounded-md flex items-center justify-center">
                      <Home className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <CardTitle className={tokens.heading.subsection}>
                      {householdData.household_name || 'Household'}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {householdData.members
                    .filter((m: any) => m.client_id !== client?.id)
                    .map((member: any) => {
                      const mc = member.client;
                      if (!mc) return null;
                      const mInitials = mc.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
                      return (
                        <div key={member.id} className="flex items-center gap-2.5 text-sm">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] font-display bg-primary/10">{mInitials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium truncate block">{mc.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {mc.visit_count || 0} visits · {formatCurrencyWhole(Number(mc.total_spend || 0))}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Contact Info — Phorest-aligned */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card/80 backdrop-blur-xl border-border/60">
            <EditHeader
              title="Contact Information"
              icon={Mail}
              isEditMode={isEditing}
              onStart={startEditing}
              onCancel={cancelEditing}
              onSave={() => saveMutation.mutate()}
              isPending={saveMutation.isPending}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground px-6 -mt-1 mb-1">
                Changes are saved locally and won't sync back to Phorest.
              </p>
            )}
            <CardContent className="space-y-2 text-sm">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">First Name</label>
                    <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Last Name</label>
                    <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Gender</label>
                    <Select value={editGender} onValueChange={setEditGender}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Non-Binary">Non-Binary</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Phone</label>
                    <Input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Landline</label>
                    <Input type="tel" value={editLandline} onChange={(e) => setEditLandline(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Email</label>
                    <Input type="email" autoCapitalize="none" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              ) : (
                <>
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{formatPhoneDisplay(client.phone)}</span>
                    </div>
                  )}
                  {client.landline && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{formatPhoneDisplay(client.landline)} (landline)</span>
                    </div>
                  )}
                  {client.gender && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs">Gender: {client.gender}</span>
                    </div>
                  )}
                  {(locationName || client.branch_name) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{locationName || client.branch_name}</span>
                    </div>
                  )}
                  {client.last_visit && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Last visit: {formatDate(new Date(client.last_visit), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {/* Source badge in contact section */}
                  {client.lead_source && (
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="outline" className={cn("text-xs font-medium", getLeadSourceColor(client.lead_source))}>
                        {getLeadSourceLabel(client.lead_source)}
                      </Badge>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          </motion.div>

          {/* Source */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-card/80 backdrop-blur-xl border-border/60">
            <EditHeader
              title="Source"
              icon={Megaphone}
              isEditMode={isEditingSource}
              onStart={startEditingSource}
              onCancel={() => setIsEditingSource(false)}
              onSave={() => saveSourceMutation.mutate()}
              isPending={saveSourceMutation.isPending}
            />
            <CardContent className="space-y-2 text-sm">
              {isEditingSource ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">How did they hear about us?</label>
                    <Select value={editLeadSource} onValueChange={(v) => { setEditLeadSource(v); if (v !== 'other') setEditLeadSourceCustom(''); }}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select source..." />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_SOURCES.map(source => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editLeadSource === 'other' && (
                    <div>
                      <label className="text-xs text-muted-foreground">Please specify</label>
                      <Input value={editLeadSourceCustom} onChange={(e) => setEditLeadSourceCustom(e.target.value)} className="h-8 text-sm" placeholder="e.g. Magazine ad, friend's recommendation..." />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground">Referred By</label>
                    <Input value={editReferredBy} onChange={(e) => setEditReferredBy(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {client.lead_source ? (
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-muted-foreground" />
                      <Badge variant="outline" className={cn("text-xs font-medium", getLeadSourceColor(client.lead_source))}>
                        {getLeadSourceLabel(client.lead_source)}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No source recorded</p>
                  )}
                  {client.referred_by && (
                    <p><span className="text-muted-foreground">Referred by:</span> {client.referred_by}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>

          {/* Important Dates */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card/80 backdrop-blur-xl border-border/60">
            <EditHeader
              title="Important Dates"
              icon={Calendar}
              isEditMode={isEditingDates}
              onStart={startEditingDates}
              onCancel={cancelEditingDates}
              onSave={() => saveDatesMutation.mutate()}
              isPending={saveDatesMutation.isPending}
            />
            <CardContent className="space-y-2 text-sm">
              {isEditingDates ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Birthday</label>
                    <Input type="date" value={editBirthday} onChange={(e) => setEditBirthday(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Client Since</label>
                    <Input type="date" value={editClientSince} onChange={(e) => setEditClientSince(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Cake className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {client.birthday 
                        ? `Birthday: ${formatDate(new Date(client.birthday + 'T00:00:00'), 'MMM d')}`
                        : 'No birthday on file'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {client.client_since ? (
                        <>
                          Client since {formatDate(new Date(client.client_since + 'T00:00:00'), 'MMM yyyy')}
                          {' — '}
                          {(() => {
                            const years = differenceInDays(new Date(), new Date(client.client_since + 'T00:00:00')) / 365;
                            if (years >= 1) return `${Math.floor(years)} year${Math.floor(years) !== 1 ? 's' : ''}`;
                            const months = Math.floor(differenceInDays(new Date(), new Date(client.client_since + 'T00:00:00')) / 30);
                            return months === 0 ? 'Less than 1 month' : `${months} month${months !== 1 ? 's' : ''}`;
                          })()}
                        </>
                      ) : 'No start date on file'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          </motion.div>

          {/* Notifications — Marketing + Reminders */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="bg-card/80 backdrop-blur-xl border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-muted rounded-md flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-primary" />
                </div>
                <CardTitle className={tokens.heading.subsection}>Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ClientMarketingStatus 
                clientId={client.id} 
                organizationId={selectedOrganization?.id} 
              />
              {/* Reminder Consent */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <p className="text-xs font-medium text-muted-foreground font-display uppercase tracking-wide">Reminder Consent</p>
                  {canEdit && !isEditingReminders && (
                    <Button variant="ghost" size="sm" onClick={startEditingReminders} className="h-7 px-2">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {isEditingReminders && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingReminders(false)} className="h-7 px-2 text-muted-foreground">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => saveRemindersMutation.mutate()} disabled={saveRemindersMutation.isPending} className="h-7 px-2 text-primary">
                        {saveRemindersMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  )}
                </div>
                {isEditingReminders ? (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={editReminderEmail} onCheckedChange={(v) => setEditReminderEmail(!!v)} />
                      Email reminders
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={editReminderSms} onCheckedChange={(v) => setEditReminderSms(!!v)} />
                      SMS reminders
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>Email: {client.reminder_email_opt_in !== false ? 'On' : 'Off'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span>SMS: {client.reminder_sms_opt_in !== false ? 'On' : 'Off'}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* Client Settings */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-card/80 backdrop-blur-xl border-border/60">
            <EditHeader
              title="Client Settings"
              icon={Settings}
              isEditMode={isEditingSettings}
              onStart={startEditingSettings}
              onCancel={() => setIsEditingSettings(false)}
              onSave={() => saveSettingsMutation.mutate()}
              isPending={saveSettingsMutation.isPending}
            />
            <CardContent className="space-y-2 text-sm">
              {isEditingSettings ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Client Category</label>
                    <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">How did they hear about us?</label>
                    <Select value={editLeadSource} onValueChange={(v) => { setEditLeadSource(v); if (v !== 'other') setEditLeadSourceCustom(''); }}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select source..." />
                      </SelectTrigger>
                      <SelectContent>
                        {LEAD_SOURCES.map(source => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editLeadSource === 'other' && (
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground">Please specify</label>
                      <Input value={editLeadSourceCustom} onChange={(e) => setEditLeadSourceCustom(e.target.value)} className="h-8 text-sm" placeholder="e.g. Magazine ad, friend's recommendation..." />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground">Referred By</label>
                    <Input value={editReferredBy} onChange={(e) => setEditReferredBy(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">External Client ID</label>
                    <Input value={editExternalId} onChange={(e) => setEditExternalId(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Preferred Stylist</label>
                    <Select value={editPreferredStylist} onValueChange={setEditPreferredStylist}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select stylist..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {/* Show inactive current stylist as disabled context */}
                        {preferredStylist && !preferredStylist.is_active && (
                          <SelectItem value={preferredStylist.user_id} disabled>
                            {getStylistDisplayName(preferredStylist)} (inactive)
                          </SelectItem>
                        )}
                        {teamMembers?.map(member => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {formatName(member)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {client.client_category && <p><span className="text-muted-foreground">Category:</span> {client.client_category}</p>}
                  {client.lead_source && <p><span className="text-muted-foreground">Source:</span> {client.lead_source}</p>}
                  {client.referred_by && <p><span className="text-muted-foreground">Referred by:</span> {client.referred_by}</p>}
                  {client.external_client_id && <p><span className="text-muted-foreground">External ID:</span> {client.external_client_id}</p>}
                  <p>
                    <span className="text-muted-foreground">Preferred Stylist:</span>{' '}
                    {client.preferred_stylist_id ? (
                      <>
                        {getStylistDisplayName(preferredStylist)}
                        {preferredStylist && !preferredStylist.is_active && (
                          <span className="text-muted-foreground ml-1">(no longer active)</span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground italic">None assigned</span>
                    )}
                  </p>
                  {!client.client_category && !client.lead_source && !client.referred_by && !client.external_client_id && !client.preferred_stylist_id && (
                    <p className="text-muted-foreground italic">No settings configured</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>

          {/* Prompts */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="bg-card/80 backdrop-blur-xl border-border/60">
            <EditHeader
              title="Prompts"
              icon={StickyNote}
              isEditMode={isEditingPrompts}
              onStart={startEditingPrompts}
              onCancel={() => setIsEditingPrompts(false)}
              onSave={() => savePromptsMutation.mutate()}
              isPending={savePromptsMutation.isPending}
            />
            <CardContent className="space-y-2 text-sm">
              {isEditingPrompts ? (
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <Checkbox checked={editPromptClientNotes} onCheckedChange={(v) => setEditPromptClientNotes(!!v)} />
                    Prompt on client notes
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox checked={editPromptAppointmentNotes} onCheckedChange={(v) => setEditPromptAppointmentNotes(!!v)} />
                    Prompt on appointment notes
                  </label>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p>Client notes: {client.prompt_client_notes ? 'Prompt enabled' : 'Off'}</p>
                  <p>Appointment notes: {client.prompt_appointment_notes ? 'Prompt enabled' : 'Off'}</p>
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>

          {/* Address */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-card/80 backdrop-blur-xl border-border/60">
            <EditHeader
              title="Address"
              icon={Home}
              isEditMode={isEditingAddress}
              onStart={startEditingAddress}
              onCancel={() => setIsEditingAddress(false)}
              onSave={() => saveAddressMutation.mutate()}
              isPending={saveAddressMutation.isPending}
            />
            <CardContent className="space-y-2 text-sm">
              {isEditingAddress ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Address Line 1</label>
                    <Input value={editAddress1} onChange={(e) => setEditAddress1(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Address Line 2</label>
                    <Input value={editAddress2} onChange={(e) => setEditAddress2(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">City</label>
                    <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">State / Region</label>
                    <Input value={editState} onChange={(e) => setEditState(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Zip / Postcode</label>
                    <Input value={editZip} onChange={(e) => setEditZip(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Country</label>
                    <Input value={editCountry} onChange={(e) => setEditCountry(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              ) : (
                <>
                  {hasAddress ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        {client.address_line1 && <p>{client.address_line1}</p>}
                        {client.address_line2 && <p>{client.address_line2}</p>}
                        <p>{[client.city, client.state, client.zip].filter(Boolean).join(', ')}</p>
                        {client.country && <p>{client.country}</p>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No address on file</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          </motion.div>

          {/* Preferred Services */}
          {client.preferred_services && client.preferred_services.length > 0 && (
            <Card className="bg-card/80 backdrop-blur-xl border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className={tokens.heading.subsection}>Preferred Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {client.preferred_services.map(service => (
                    <Badge key={service} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Appointments Card */}
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const upcomingVisits = (visitHistory || []).filter(
              v => v.appointment_date >= today && v.status !== 'cancelled'
            );
            if (upcomingVisits.length === 0) return null;
            return (
              <Card className="bg-card/80 backdrop-blur-xl border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={tokens.card.iconBox}>
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <CardTitle className={tokens.card.title}>Upcoming Appointments</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {upcomingVisits.length} upcoming
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {upcomingVisits.map(visit => {
                    const statusConfig = { completed: { color: 'text-green-600', label: 'Completed' }, confirmed: { color: 'text-blue-600', label: 'Confirmed' }, checked_in: { color: 'text-blue-600', label: 'Checked In' }, booked: { color: 'text-muted-foreground', label: 'Booked' }, cancelled: { color: 'text-muted-foreground', label: 'Cancelled' }, no_show: { color: 'text-red-600', label: 'No Show' } }[visit.status] || { color: 'text-muted-foreground', label: visit.status };
                    return (
                      <div
                        key={visit.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/dashboard/appointments-hub?search=${encodeURIComponent(client.name)}`);
                        }}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-sans text-sm text-foreground">{formatDate(visit.appointment_date, 'EEE, MMM d')}</span>
                            <span className="text-xs text-muted-foreground">
                              {(() => { const [h, m] = visit.start_time.split(':'); const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`; })()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-sans text-xs text-muted-foreground truncate">{visit.service_name}</span>
                            {visit.stylist_name && (
                              <>
                                <span className="text-muted-foreground/40">·</span>
                                <span className="font-sans text-xs text-muted-foreground truncate">{visit.stylist_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={cn('text-[10px] shrink-0', statusConfig.color)}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })()}

          {/* View All Appointments link */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 rounded-xl border-border/60"
            onClick={() => {
              onOpenChange(false);
              navigate(`/dashboard/appointments-hub?search=${encodeURIComponent(client.name)}`);
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View All Appointments
          </Button>

          {/* Client Product Affinity */}
          <ClientAffinityBadges phorestClientId={client.phorest_client_id} className="mt-1" />

          {/* Tabs for History, Notes, Transactions, and Redos */}
          <Tabs defaultValue="history" className="mt-0">
            <TabsList className="w-full rounded-xl">
              <TabsTrigger value="history" className="flex-1">Visit History</TabsTrigger>
              <TabsTrigger value="transformations" className="flex-1 gap-1">
                <Camera className="w-3.5 h-3.5" />
                Transformations
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex-1 gap-1">
                <Receipt className="w-3.5 h-3.5" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="formulas" className="flex-1 gap-1">
                <Beaker className="w-3.5 h-3.5" />
                Formulas
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
              <TabsTrigger value="redos" className="flex-1">Redos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="history" className="mt-4">
              <VisitHistoryTimeline 
                visits={visitHistory || []} 
                isLoading={historyLoading} 
              />
            </TabsContent>

            <TabsContent value="transformations" className="mt-4">
              <TransformationTimeline
                clientId={client.id}
                phorestClientId={client.phorest_client_id}
              />
            </TabsContent>

            <TabsContent value="transactions" className="mt-4">
              <TransactionHistoryTimeline
                transactions={transactionData?.transactions || []}
                summary={transactionData?.summary || { totalSpend: 0, serviceSpend: 0, productSpend: 0, visitCount: 0, averageTicket: 0, preferredStaffId: null, preferredStaffName: null, firstVisit: null, lastVisit: null }}
                isLoading={transactionsLoading}
              />
            </TabsContent>
            
            <TabsContent value="formulas" className="mt-4">
              <ClientFormulaHistoryTab clientId={client.phorest_client_id || client.id} />
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <ClientNotesSection clientId={client.id} />
            </TabsContent>

            <TabsContent value="redos" className="mt-4">
              <ClientRedoHistory clientId={client.id} />
            </TabsContent>
          </Tabs>

          {/* Merge + Archive & Ban Actions */}
          {roles.some(role => ['admin', 'manager', 'super_admin'].includes(role)) && (
            <div className="flex items-center gap-2 pt-4 mt-2 border-t border-border/40">
              {canMerge && (client as any).status !== 'merged' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/dashboard/admin/merge-clients?clientIds=${client.id}`);
                  }}
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  Merge
                </Button>
              )}
              <ArchiveClientToggle
                clientId={client.id}
                clientName={client.name}
                isArchived={client.is_archived || false}
              />
              <BanClientToggle
                clientId={client.id}
                clientName={client.name}
                isBanned={client.is_banned || false}
                banReason={client.ban_reason}
              />
            </div>
          )}
        </div>
            </ScrollArea>
    </PremiumFloatingPanel>
  );
}
