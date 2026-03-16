import { useEffect, useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { formatPhoneNumber, cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Building2, Loader2, AlertTriangle, CalendarIcon } from 'lucide-react';
import { useUpdateOrganization, type Organization, type BusinessType } from '@/hooks/useOrganizations';
import { PlatformButton } from './ui/PlatformButton';
import { PlatformInput } from './ui/PlatformInput';
import { Button } from '@/components/ui/button';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { ScrollArea } from '@/components/ui/scroll-area';

const editFormSchema = z.object({
  // Basic Info
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  legal_name: z.string().optional().nullable(),
  business_type: z.enum(['salon', 'spa', 'esthetics', 'barbershop', 'med_spa', 'wellness', 'other']),
  logo_url: z.string().optional().nullable().or(z.literal('')),
  website_url: z.string().optional().nullable().or(z.literal('')),
  
  // Account Status
  status: z.enum(['pending', 'active', 'suspended', 'churned']),
  onboarding_stage: z.enum(['new', 'importing', 'training', 'live']),
  subscription_tier: z.string(),
  timezone: z.string(),
  go_live_date: z.string().optional().nullable(),
  
  // Contact Info
  primary_contact_email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  primary_contact_phone: z.string().optional().nullable(),
  
  // Migration Info
  source_software: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof editFormSchema>;

const businessTypeOptions = [
  { value: 'salon', label: 'Salon' },
  { value: 'spa', label: 'Spa' },
  { value: 'esthetics', label: 'Esthetics' },
  { value: 'barbershop', label: 'Barbershop' },
  { value: 'med_spa', label: 'Med Spa' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'other', label: 'Other' },
];

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'churned', label: 'Churned' },
];

const onboardingStageOptions = [
  { value: 'new', label: 'New' },
  { value: 'importing', label: 'Importing Data' },
  { value: 'training', label: 'Training' },
  { value: 'live', label: 'Live' },
];

const subscriptionTierOptions = [
  { value: 'starter', label: 'Starter' },
  { value: 'standard', label: 'Standard' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise', label: 'Enterprise' },
];

const timezoneOptions = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (AZ)' },
  { value: 'America/Anchorage', label: 'Alaska (AK)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HI)' },
  { value: 'America/Toronto', label: 'Eastern Time (Canada)' },
  { value: 'America/Vancouver', label: 'Pacific Time (Canada)' },
];

const sourceSoftwareOptions = [
  { value: 'phorest', label: 'Phorest' },
  { value: 'mindbody', label: 'Mindbody' },
  { value: 'boulevard', label: 'Boulevard' },
  { value: 'vagaro', label: 'Vagaro' },
  { value: 'square', label: 'Square' },
  { value: 'other', label: 'Other' },
  { value: 'none', label: 'None (New Business)' },
];

interface EditOrganizationDialogProps {
  organization: Organization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditOrganizationDialog({ organization, open, onOpenChange }: EditOrganizationDialogProps) {
  const { formatDate } = useFormatDate();
  const updateOrg = useUpdateOrganization();
  const [originalSlug, setOriginalSlug] = useState(organization.slug);

  const form = useForm<FormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
      legal_name: organization.legal_name || '',
      business_type: organization.business_type || 'salon',
      logo_url: organization.logo_url || '',
      website_url: organization.website_url || '',
      status: organization.status || 'pending',
      onboarding_stage: organization.onboarding_stage || 'new',
      subscription_tier: organization.subscription_tier || 'standard',
      timezone: organization.timezone || 'America/Chicago',
      primary_contact_email: organization.primary_contact_email || '',
      primary_contact_phone: organization.primary_contact_phone || '',
      source_software: organization.source_software || '',
      go_live_date: organization.go_live_date || null,
    },
  });

  // Reset form when organization changes
  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        slug: organization.slug,
        legal_name: organization.legal_name || '',
        business_type: organization.business_type || 'salon',
        logo_url: organization.logo_url || '',
        website_url: organization.website_url || '',
        status: organization.status || 'pending',
        onboarding_stage: organization.onboarding_stage || 'new',
        subscription_tier: organization.subscription_tier || 'standard',
        timezone: organization.timezone || 'America/Chicago',
        primary_contact_email: organization.primary_contact_email || '',
        primary_contact_phone: organization.primary_contact_phone || '',
        source_software: organization.source_software || '',
        go_live_date: organization.go_live_date || null,
      });
      setOriginalSlug(organization.slug);
    }
  }, [organization, form]);

  const currentSlug = form.watch('slug');
  const slugChanged = currentSlug !== originalSlug;
  const currentStatus = form.watch('status');
  const currentGoLiveDate = form.watch('go_live_date');
  const isGoLiveDatePast = currentGoLiveDate ? isBefore(parseISO(currentGoLiveDate), startOfDay(new Date())) : false;

  const onSubmit = async (values: FormValues) => {
    try {
      // If status changed from pending to active, set activated_at
      const updates: Partial<Omit<Organization, 'id'>> & { id: string } = {
        id: organization.id,
        name: values.name,
        slug: values.slug,
        legal_name: values.legal_name || null,
        business_type: values.business_type as BusinessType,
        logo_url: values.logo_url || null,
        website_url: values.website_url || null,
        status: values.status,
        onboarding_stage: values.onboarding_stage,
        subscription_tier: values.subscription_tier,
        timezone: values.timezone,
        primary_contact_email: values.primary_contact_email || null,
        primary_contact_phone: values.primary_contact_phone || null,
        source_software: values.source_software || null,
        go_live_date: values.go_live_date || null,
      };

      // Auto-set activated_at when status changes to active
      if (values.status === 'active' && organization.status !== 'active' && !organization.activated_at) {
        updates.activated_at = new Date().toISOString();
      }

      await updateOrg.mutateAsync(updates);
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] bg-slate-800 border-slate-700 p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Building2 className="h-5 w-5 text-violet-400" />
            </div>
            Edit Organization
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Update account settings for {organization.name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <Form {...form}>
            <form id="edit-org-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Business Name *</FormLabel>
                        <FormControl>
                          <PlatformInput placeholder="Luxe Hair Studio" {...field} />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">URL Slug *</FormLabel>
                        <FormControl>
                          <PlatformInput placeholder="luxe-hair-studio" {...field} autoCapitalize="none" />
                        </FormControl>
                        {slugChanged && (
                          <p className="text-amber-400 text-xs flex items-center gap-1 mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            Changing the slug may break existing integrations
                          </p>
                        )}
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="legal_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Legal Name</FormLabel>
                        <FormControl>
                          <PlatformInput placeholder="Luxe Hair Studio LLC" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="business_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Business Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {businessTypeOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className="text-slate-300 focus:bg-slate-700 focus:text-white"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Logo URL</FormLabel>
                        <FormControl>
                          <PlatformInput 
                            placeholder="https://..." 
                            {...field} 
                            value={field.value || ''} 
                            autoCapitalize="none"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Website URL</FormLabel>
                        <FormControl>
                          <PlatformInput 
                            placeholder="https://..." 
                            {...field} 
                            value={field.value || ''} 
                            autoCapitalize="none"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Account Status Section */}
              <div className="space-y-4 pt-2 border-t border-slate-700/50">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider pt-4">Account Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Status *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {statusOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className="text-slate-300 focus:bg-slate-700 focus:text-white"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {currentStatus === 'active' && organization.status !== 'active' && !organization.activated_at && (
                          <FormDescription className="text-emerald-400 text-xs">
                            Activated date will be set automatically
                          </FormDescription>
                        )}
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="onboarding_stage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Onboarding Stage *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {onboardingStageOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className="text-slate-300 focus:bg-slate-700 focus:text-white"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="subscription_tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Subscription Plan</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                              <SelectValue placeholder="Select plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {subscriptionTierOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className="text-slate-300 focus:bg-slate-700 focus:text-white"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Timezone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {timezoneOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className="text-slate-300 focus:bg-slate-700 focus:text-white"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Go-Live Date Picker */}
                <FormField
                  control={form.control}
                  name="go_live_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-slate-300">Scheduled Go-Live Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 hover:text-slate-200",
                                !field.value && "text-slate-500"
                              )}
                            >
                              {field.value ? (
                                formatDate(parseISO(field.value), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? parseISO(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : null)}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                          {field.value && (
                            <div className="border-t border-slate-700 p-2">
                              <Button
                                variant="ghost"
                                size={tokens.button.inline}
                                className="w-full text-slate-400 hover:text-white hover:bg-slate-700"
                                onClick={() => field.onChange(null)}
                              >
                                Clear date
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                      <FormDescription className="text-slate-500">
                        The date when final import completes and the account begins live operations.
                      </FormDescription>
                      {isGoLiveDatePast && (
                        <p className="text-amber-400 text-xs flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          This date is in the past
                        </p>
                      )}
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Information Section */}
              <div className="space-y-4 pt-2 border-t border-slate-700/50">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider pt-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primary_contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Contact Email</FormLabel>
                        <FormControl>
                          <PlatformInput 
                            type="email" 
                            placeholder="owner@salon.com" 
                            {...field} 
                            value={field.value || ''} 
                            autoCapitalize="none"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primary_contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Contact Phone</FormLabel>
                        <FormControl>
                          <PlatformInput 
                            placeholder="(555) 123-4567" 
                            value={field.value || ''} 
                            onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Migration Info Section */}
              <div className="space-y-4 pt-2 border-t border-slate-700/50">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider pt-4">Migration Info</h3>
                <FormField
                  control={form.control}
                  name="source_software"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Previous Software</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/70 focus:ring-violet-500/30">
                            <SelectValue placeholder="Select previous software" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {sourceSoftwareOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className="text-slate-300 focus:bg-slate-700 focus:text-white"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-slate-500">
                        What software is this salon migrating from?
                      </FormDescription>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </ScrollArea>

        {/* Footer with metadata and actions */}
        <div className="flex items-center justify-between border-t border-slate-700/50 px-6 py-4 bg-slate-800/50">
          <div className="text-xs text-slate-500">
            {organization.account_number && `Account #${organization.account_number} • `}
            Created {formatDate(new Date(organization.created_at), 'MMM d, yyyy')}
          </div>
          <div className="flex gap-2">
            <PlatformButton type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </PlatformButton>
            <PlatformButton 
              type="submit" 
              form="edit-org-form" 
              disabled={updateOrg.isPending}
            >
              {updateOrg.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </PlatformButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
