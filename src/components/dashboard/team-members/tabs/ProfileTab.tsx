import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Link2, Unlink, Plug } from 'lucide-react';
import { toast } from 'sonner';
import { tokens } from '@/lib/design-tokens';
import { useUserPhorestMapping, useDeleteStaffMapping } from '@/hooks/usePhorestSync';

interface Props {
  userId: string;
  profile: any;
}

export function ProfileTab({ userId, profile }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    full_name: profile.full_name ?? '',
    display_name: profile.display_name ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    job_title: profile.job_title ?? '',
    bio: profile.bio ?? '',
    hire_date: profile.hire_date ?? '',
    emergency_contact_name: profile.emergency_contact_name ?? '',
    emergency_contact_phone: profile.emergency_contact_phone ?? '',
  });

  useEffect(() => {
    setForm({
      full_name: profile.full_name ?? '',
      display_name: profile.display_name ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      job_title: profile.job_title ?? '',
      bio: profile.bio ?? '',
      hire_date: profile.hire_date ?? '',
      emergency_contact_name: profile.emergency_contact_name ?? '',
      emergency_contact_phone: profile.emergency_contact_phone ?? '',
    });
  }, [profile]);

  const { data: phorestMapping } = useUserPhorestMapping(userId);
  const deleteMapping = useDeleteStaffMapping();

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('employee_profiles')
        .update({
          ...form,
          hire_date: form.hire_date || null,
        } as any)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-member-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['organization-users'] });
      queryClient.invalidateQueries({ queryKey: ['team-directory'] });
      toast.success('Profile saved');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base tracking-wide">PROFILE</CardTitle>
          <CardDescription>Personal info, contact, and employment details. Changes save when you click Save.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.photo_url ?? undefined} />
              <AvatarFallback>{(form.full_name || '?').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className={tokens.body.muted + ' text-xs'}>
              Photo upload is managed from this user's own profile page.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="display_name">Display name</Label>
              <Input id="display_name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="job_title">Job title</Label>
              <Input id="job_title" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="hire_date">Hire date</Label>
              <Input id="hire_date" type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergency_contact_name">Emergency contact name</Label>
              <Input id="emergency_contact_name" value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="emergency_contact_phone">Emergency contact phone</Label>
              <Input id="emergency_contact_phone" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-1.5">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-primary" />
            <CardTitle className="font-display text-base tracking-wide">POS INTEGRATION</CardTitle>
          </div>
          <CardDescription>Link this team member to their POS staff record so analytics resolve correctly.</CardDescription>
        </CardHeader>
        <CardContent>
          {phorestMapping ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-sans text-sm text-foreground truncate">
                    Linked to Phorest: <span className="font-medium">{phorestMapping.phorest_staff_name || phorestMapping.phorest_staff_id}</span>
                  </p>
                  {phorestMapping.phorest_branch_name && (
                    <p className="font-sans text-xs text-muted-foreground">Branch: {phorestMapping.phorest_branch_name}</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteMapping.mutate(phorestMapping.id)}
                disabled={deleteMapping.isPending}
                className="gap-1.5 shrink-0"
              >
                <Unlink className="h-3.5 w-3.5" /> Unlink
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-dashed border-border/60">
              <p className={tokens.body.muted + ' text-sm'}>No POS staff record linked yet.</p>
              <Button asChild variant="outline" size="sm">
                <a href="/dashboard/admin/phorest">Link to POS →</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
