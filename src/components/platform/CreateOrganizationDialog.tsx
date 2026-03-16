import { useForm } from 'react-hook-form';
import { formatPhoneNumber } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  PlatformDialogDescription as DialogDescription,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
} from '@/components/platform/ui/PlatformDialog';
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
import { Building2, Loader2 } from 'lucide-react';
import { useCreateOrganization, type BusinessType } from '@/hooks/useOrganizations';
import { useNavigate } from 'react-router-dom';
import { PlatformButton } from './ui/PlatformButton';
import { PlatformInput } from './ui/PlatformInput';
import { PlatformLabel } from './ui/PlatformLabel';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  legal_name: z.string().optional(),
  primary_contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  primary_contact_phone: z.string().optional(),
  source_software: z.string().optional(),
  subscription_tier: z.string().default('standard'),
  business_type: z.enum(['salon', 'spa', 'esthetics', 'barbershop', 'med_spa', 'wellness', 'other']).default('salon'),
});

const businessTypeOptions = [
  { value: 'salon', label: 'Salon' },
  { value: 'spa', label: 'Spa' },
  { value: 'esthetics', label: 'Esthetics' },
  { value: 'barbershop', label: 'Barbershop' },
  { value: 'med_spa', label: 'Med Spa' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'other', label: 'Other' },
];

type FormValues = z.infer<typeof formSchema>;

const sourceSoftwareOptions = [
  { value: 'phorest', label: 'Phorest' },
  { value: 'mindbody', label: 'Mindbody' },
  { value: 'boulevard', label: 'Boulevard' },
  { value: 'vagaro', label: 'Vagaro' },
  { value: 'square', label: 'Square' },
  { value: 'other', label: 'Other' },
  { value: 'none', label: 'None (New Business)' },
];

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
  const navigate = useNavigate();
  const createOrg = useCreateOrganization();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      legal_name: '',
      primary_contact_email: '',
      primary_contact_phone: '',
      source_software: '',
      subscription_tier: 'standard',
      business_type: 'salon',
    },
  });

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    form.setValue('slug', slug);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await createOrg.mutateAsync({
        name: values.name,
        slug: values.slug,
        legal_name: values.legal_name || null,
        primary_contact_email: values.primary_contact_email || null,
        primary_contact_phone: values.primary_contact_phone || null,
        source_software: values.source_software || null,
        subscription_tier: values.subscription_tier,
        business_type: values.business_type as BusinessType,
      });
      
      onOpenChange(false);
      form.reset();
      if (result?.id) {
        navigate(`/dashboard/platform/accounts/${result.id}`);
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Building2 className="h-5 w-5 text-violet-400" />
            </div>
            Create Account
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Set up a new organization on the platform
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Business Name *</FormLabel>
                  <FormControl>
                    <PlatformInput 
                      placeholder="Luxe Hair Studio" 
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleNameChange(e.target.value);
                      }}
                    />
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
                  <FormDescription className="text-slate-500">
                    Unique identifier used in URLs (auto-generated from name)
                  </FormDescription>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {businessTypeOptions.map((option) => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
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
              name="legal_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Legal Name</FormLabel>
                  <FormControl>
                    <PlatformInput placeholder="Luxe Hair Studio LLC" {...field} />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primary_contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Contact Email</FormLabel>
                    <FormControl>
                      <PlatformInput type="email" placeholder="owner@salon.com" {...field} autoCapitalize="none" />
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

            <FormField
              control={form.control}
              name="source_software"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Previous Software</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select previous software" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sourceSoftwareOptions.map((option) => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
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

            <FormField
              control={form.control}
              name="subscription_tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Subscription Tier</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <PlatformButton type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </PlatformButton>
              <PlatformButton type="submit" disabled={createOrg.isPending}>
                {createOrg.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Account
              </PlatformButton>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
