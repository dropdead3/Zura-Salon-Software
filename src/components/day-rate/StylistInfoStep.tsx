import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Mail, Phone, Award, Building2, Instagram } from 'lucide-react';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const formSchema = z.object({
  stylist_name: z.string().min(2, 'Name must be at least 2 characters'),
  stylist_email: z.string().email('Please enter a valid email'),
  stylist_phone: z.string().min(10, 'Please enter a valid phone number'),
  license_number: z.string().min(1, 'License number is required'),
  license_state: z.string().min(2, 'Please select your license state'),
  business_name: z.string().optional(),
  instagram_handle: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface StylistInfoStepProps {
  initialData: Partial<FormData>;
  onSubmit: (data: FormData) => void;
}

export function StylistInfoStep({ initialData, onSubmit }: StylistInfoStepProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stylist_name: initialData.stylist_name || '',
      stylist_email: initialData.stylist_email || '',
      stylist_phone: initialData.stylist_phone || '',
      license_number: initialData.license_number || '',
      license_state: initialData.license_state || '',
      business_name: initialData.business_name || '',
      instagram_handle: initialData.instagram_handle || '',
    },
  });


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <p className="text-muted-foreground text-sm text-center mb-6">
          Please provide your information to complete the booking
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="stylist_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name *
                </FormLabel>
                <FormControl>
                  <Input placeholder="Jane Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stylist_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email *
                </FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="jane@example.com" 
                    autoCapitalize="none"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stylist_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone *
                </FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="license_state"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  License State *
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {US_STATES.map(state => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="license_number"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Cosmetology License Number *
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter your license number" 
                    autoCapitalize="none"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Optional Fields */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-4">Optional Information</p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Business Name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Your salon or business name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagram_handle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram Handle
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="@yourhandle" 
                      autoCapitalize="none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" size={tokens.button.hero}>
          Continue to Agreement
        </Button>
      </form>
    </Form>
  );
}
