import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Settings2, X, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import type { StaffMeetingInfo, CadenceSettings } from '@/hooks/useTeamMeetingOverview';

interface CadenceSettingsDialogProps {
  staff: StaffMeetingInfo[];
  cadence: CadenceSettings;
  onUpdateCadence: (args: { userId: string | null; cadenceDays: number }) => void;
  onRemoveOverride: (args: { userId: string }) => void;
  isUpdating: boolean;
}

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export function CadenceSettingsDialog({ staff, cadence, onUpdateCadence, onRemoveOverride, isUpdating }: CadenceSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [globalDays, setGlobalDays] = useState(cadence.globalDefault);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Sync local state when dialog opens
  useEffect(() => {
    if (open) {
      setGlobalDays(cadence.globalDefault);
      const o: Record<string, string> = {};
      Object.entries(cadence.overrides).forEach(([uid, days]) => {
        o[uid] = days.toString();
      });
      setOverrides(o);
    }
  }, [open, cadence]);

  const handleSaveGlobal = () => {
    if (globalDays > 0 && globalDays !== cadence.globalDefault) {
      onUpdateCadence({ userId: null, cadenceDays: globalDays });
    }
  };

  const handleSaveOverride = (userId: string) => {
    const val = parseInt(overrides[userId] || '');
    if (!isNaN(val) && val > 0) {
      onUpdateCadence({ userId, cadenceDays: val });
    }
  };

  const handleRemoveOverride = (userId: string) => {
    onRemoveOverride({ userId });
    setOverrides(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  // Exclude managers/admins from the override list (they're the coaches, not the coached)
  const coachableStaff = staff.filter(s => {
    const role = s.role || '';
    return !['admin', 'super_admin'].includes(role);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Meeting Cadence Settings</DialogTitle>
          <DialogDescription>
            Set how often each team member should have a 1:1 meeting. Overdue badges appear when the cadence is exceeded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Global Default */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Default Cadence (All Staff)</Label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Every</span>
              <Input
                type="number"
                min={1}
                max={365}
                value={globalDays}
                onChange={(e) => setGlobalDays(parseInt(e.target.value) || 14)}
                className="w-20 tabular-nums"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">days</span>
              <Button
                size={tokens.button.inline}
                variant="outline"
                onClick={handleSaveGlobal}
                disabled={isUpdating || globalDays === cadence.globalDefault || globalDays < 1}
              >
                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Staff without a custom override will use this cadence.
            </p>
          </div>

          {/* Per-Staff Overrides */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Per-Staff Overrides</Label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Set a custom cadence for specific team members. Leave blank to use the global default ({globalDays} days).
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead className="w-[100px] text-right">Days</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {coachableStaff.map(s => {
                  const hasOverride = s.userId in cadence.overrides || overrides[s.userId] !== undefined;
                  return (
                    <TableRow key={s.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            {s.photoUrl && <AvatarImage src={s.photoUrl} />}
                            <AvatarFallback className="text-[8px]">{getInitials(s.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{s.name}</span>
                          {s.role && <Badge variant="outline" className="text-[9px] capitalize">{s.role}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          placeholder={globalDays.toString()}
                          value={overrides[s.userId] ?? ''}
                          onChange={(e) => setOverrides(prev => ({ ...prev, [s.userId]: e.target.value }))}
                          onBlur={() => {
                            const val = parseInt(overrides[s.userId] || '');
                            if (!isNaN(val) && val > 0) handleSaveOverride(s.userId);
                          }}
                          className="w-16 h-8 text-right tabular-nums ml-auto"
                        />
                      </TableCell>
                      <TableCell>
                        {hasOverride && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleRemoveOverride(s.userId)}
                            title="Reset to default"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
