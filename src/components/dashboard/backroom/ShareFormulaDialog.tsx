/**
 * ShareFormulaDialog — Staff picker to share a formula with another stylist.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';

interface ShareFormulaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (sharedWithUserId: string, notes: string) => void;
}

export function ShareFormulaDialog({ open, onOpenChange, onSubmit }: ShareFormulaDialogProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const [selectedStaff, setSelectedStaff] = useState('');
  const [notes, setNotes] = useState('');

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-for-share', effectiveOrganization?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('employee_profiles')
        .select('user_id, display_name, full_name')
        .eq('organization_id', effectiveOrganization!.id)
        .eq('is_active', true)
        .eq('is_approved', true);

      return ((data ?? []) as any[])
        .filter((s) => s.user_id !== user?.id)
        .map((s) => ({
          userId: s.user_id as string,
          name: (s.display_name || s.full_name || 'Unknown') as string,
        }));
    },
    enabled: !!effectiveOrganization?.id && open,
  });

  const handleSubmit = () => {
    if (!selectedStaff) return;
    onSubmit(selectedStaff, notes);
    setSelectedStaff('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide">Share Formula</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="font-sans text-sm">Share with</Label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="h-11 font-sans">
                <SelectValue placeholder="Select a stylist..." />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.userId} value={s.userId}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="font-sans text-sm">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for the stylist..."
              className="font-sans text-sm"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-sans">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedStaff} className="font-sans gap-1.5">
            <Send className="w-3.5 h-3.5" /> Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
