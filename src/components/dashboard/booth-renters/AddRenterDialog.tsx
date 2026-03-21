import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateBoothRenter } from '@/hooks/useBoothRenters';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronsUpDown, Check, Loader2, User, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  user_id: z.string().min(1, 'Please select an employee'),
  business_name: z.string().optional(),
  business_license_number: z.string().optional(),
  license_state: z.string().optional(),
  ein_number: z.string().optional(),
  billing_email: z.string().email().optional().or(z.literal('')),
  billing_phone: z.string().optional(),
  billing_street: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_zip: z.string().optional(),
  start_date: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddRenterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function AddRenterDialog({
  open,
  onOpenChange,
  organizationId,
}: AddRenterDialogProps) {
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const createRenter = useCreateBoothRenter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user_id: '',
      business_name: '',
      business_license_number: '',
      license_state: '',
      ein_number: '',
      billing_email: '',
      billing_phone: '',
      billing_street: '',
      billing_city: '',
      billing_state: '',
      billing_zip: '',
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch employees who don't have booth_renter role yet
  const { data: availableEmployees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['available-booth-renter-employees', organizationId, userSearch],
    queryFn: async () => {
      // Get employees in this organization
      let query = supabase
        .from('employee_profiles')
        .select('user_id, full_name, display_name, email, photo_url')
        .eq('organization_id', organizationId)
        .order('full_name');

      if (userSearch) {
        query = query.or(`full_name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`);
      }

      const { data: employees } = await query.limit(20);

      // Get existing booth renters to exclude them
      const { data: existingRenters } = await supabase
        .from('booth_renter_profiles' as any)
        .select('user_id')
        .eq('organization_id', organizationId);

      const existingUserIds = new Set((existingRenters || []).map((r: any) => r.user_id));

      return (employees || []).filter(e => !existingUserIds.has(e.user_id));
    },
    enabled: open,
  });

  const selectedEmployee = availableEmployees.find(e => e.user_id === form.watch('user_id'));

  const onSubmit = async (values: FormValues) => {
    await createRenter.mutateAsync({
      user_id: values.user_id,
      organization_id: organizationId,
      business_name: values.business_name || undefined,
      business_license_number: values.business_license_number || undefined,
      license_state: values.license_state || undefined,
      ein_number: values.ein_number || undefined,
      billing_email: values.billing_email || undefined,
      billing_phone: values.billing_phone || undefined,
      billing_address: values.billing_street ? {
        street: values.billing_street,
        city: values.billing_city,
        state: values.billing_state,
        zip: values.billing_zip,
      } : undefined,
      start_date: values.start_date || undefined,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Add Booth Renter
          </DialogTitle>
          <DialogDescription>
            Convert an existing employee to a booth renter with their own business profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Select Employee *</Label>
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedEmployee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedEmployee.photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {(selectedEmployee.display_name || selectedEmployee.full_name || 'U').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedEmployee.display_name || selectedEmployee.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select an employee...</span>
                  )}
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search employees..."
                    value={userSearch}
                    onValueChange={setUserSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {isLoadingEmployees ? 'Loading...' : 'No available employees found.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {availableEmployees.map((employee) => (
                        <CommandItem
                          key={employee.user_id}
                          value={employee.user_id}
                          onSelect={() => {
                            form.setValue('user_id', employee.user_id);
                            form.setValue('billing_email', employee.email || '');
                            setUserSearchOpen(false);
                          }}
                        >
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={employee.photo_url || undefined} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span>{employee.display_name || employee.full_name}</span>
                            <span className="text-xs text-muted-foreground">{employee.email}</span>
                          </div>
                          {form.watch('user_id') === employee.user_id && (
                            <Check className="ml-auto h-4 w-4" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {form.formState.errors.user_id && (
              <p className="text-sm text-destructive">{form.formState.errors.user_id.message}</p>
            )}
          </div>

          {/* Business Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Business Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  placeholder="e.g., Jane's Hair Studio"
                  {...form.register('business_name')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_license_number">License Number</Label>
                <Input
                  id="business_license_number"
                  placeholder="CO123456"
                  {...form.register('business_license_number')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_state">License State</Label>
                <Input
                  id="license_state"
                  placeholder="CO"
                  maxLength={2}
                  {...form.register('license_state')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ein_number">EIN Number</Label>
                <Input
                  id="ein_number"
                  placeholder="XX-XXXXXXX"
                  {...form.register('ein_number')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...form.register('start_date')}
                />
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Billing Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_email">Billing Email</Label>
                <Input
                  id="billing_email"
                  type="email"
                  placeholder="billing@example.com"
                  {...form.register('billing_email')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_phone">Billing Phone</Label>
                <Input
                  id="billing_phone"
                  placeholder="(555) 123-4567"
                  {...form.register('billing_phone')}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="billing_street">Street Address</Label>
                <Input
                  id="billing_street"
                  placeholder="123 Main St"
                  {...form.register('billing_street')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_city">City</Label>
                <Input
                  id="billing_city"
                  placeholder="Denver"
                  {...form.register('billing_city')}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="billing_state">State</Label>
                  <Input
                    id="billing_state"
                    placeholder="CO"
                    maxLength={2}
                    {...form.register('billing_state')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_zip">ZIP</Label>
                  <Input
                    id="billing_zip"
                    placeholder="80202"
                    {...form.register('billing_zip')}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createRenter.isPending}>
              {createRenter.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Renter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
