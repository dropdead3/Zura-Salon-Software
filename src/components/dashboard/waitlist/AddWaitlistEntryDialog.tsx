import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useAddWaitlistEntry } from '@/hooks/useWaitlist';

const schema = z.object({
  client_name: z.string().min(1, 'Client name is required'),
  client_phone: z.string().optional(),
  client_email: z.string().email('Invalid email').optional().or(z.literal('')),
  service_name: z.string().optional(),
  preferred_date_start: z.string().min(1, 'Start date is required'),
  preferred_date_end: z.string().optional(),
  preferred_time_start: z.string().optional(),
  preferred_time_end: z.string().optional(),
  priority: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AddWaitlistEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

export function AddWaitlistEntryDialog({ open, onOpenChange, organizationId }: AddWaitlistEntryDialogProps) {
  const addEntry = useAddWaitlistEntry();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_name: '',
      client_phone: '',
      client_email: '',
      service_name: '',
      preferred_date_start: '',
      preferred_date_end: '',
      preferred_time_start: '',
      preferred_time_end: '',
      priority: 0,
      notes: '',
    },
  });

  const onSubmit = (data: FormData) => {
    addEntry.mutate({
      organization_id: organizationId,
      client_name: data.client_name,
      client_phone: data.client_phone || null,
      client_email: data.client_email || null,
      service_name: data.service_name || null,
      preferred_date_start: data.preferred_date_start,
      preferred_date_end: data.preferred_date_end || null,
      preferred_time_start: data.preferred_time_start || null,
      preferred_time_end: data.preferred_time_end || null,
      priority: data.priority,
      notes: data.notes || null,
    }, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add to Waitlist</DialogTitle>
          <DialogDescription>Add a client who wants to be notified when a slot opens up.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="client_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Client Name</FormLabel>
                <FormControl><Input placeholder="Jane Smith" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="client_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input placeholder="(555) 123-4567" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="client_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="jane@email.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="service_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Requested Service</FormLabel>
                <FormControl><Input placeholder="Balayage, Color, etc." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="preferred_date_start" render={({ field }) => (
                <FormItem>
                  <FormLabel>Earliest Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preferred_date_end" render={({ field }) => (
                <FormItem>
                  <FormLabel>Latest Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="preferred_time_start" render={({ field }) => (
                <FormItem>
                  <FormLabel>Earliest Time</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preferred_time_end" render={({ field }) => (
                <FormItem>
                  <FormLabel>Latest Time</FormLabel>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="priority" render={({ field }) => (
              <FormItem>
                <FormLabel>Priority (0 = normal, higher = more urgent)</FormLabel>
                <FormControl><Input type="number" min={0} max={10} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Any additional details..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={addEntry.isPending}>
                {addEntry.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add to Waitlist
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
