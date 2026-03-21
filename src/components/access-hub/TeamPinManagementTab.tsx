import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Search, Eye, EyeOff, Crown, Shield, History, User, ExternalLink, Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTeamPinStatus, useAdminSetUserPin, usePinChangelog } from '@/hooks/useUserPin';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPrimaryOwner } from '@/hooks/useIsPrimaryOwner';
import { useFormatDate } from '@/hooks/useFormatDate';

interface TeamPinManagementTabProps {
  canManage: boolean;
}

export function TeamPinManagementTab({ canManage }: TeamPinManagementTabProps) {
  const { formatDate } = useFormatDate();
  const { user } = useAuth();
  const { data: teamMembers = [], isLoading } = useTeamPinStatus();
  const { data: changelog = [] } = usePinChangelog();
  const { data: isPrimaryOwner } = useIsPrimaryOwner();
  const adminSetPin = useAdminSetUserPin();

  const [searchQuery, setSearchQuery] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<typeof teamMembers[0] | null>(null);
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [reason, setReason] = useState('');
  const [actionMode, setActionMode] = useState<'set' | 'clear'>('set');

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenResetDialog = (member: typeof teamMembers[0], mode: 'set' | 'clear' = 'set') => {
    setSelectedMember(member);
    setNewPin('');
    setReason('');
    setActionMode(mode);
    setResetDialogOpen(true);
  };

  const handleResetPin = async () => {
    if (!selectedMember) return;

    await adminSetPin.mutateAsync({
      targetUserId: selectedMember.user_id,
      pin: newPin || null,
      reason: reason || undefined,
    });

    setResetDialogOpen(false);
    setSelectedMember(null);
    setNewPin('');
    setReason('');
  };

  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setNewPin(cleaned);
  };

  if (!canManage) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            Only Super Admins and Account Owners can manage team PINs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Team PIN Management
              </CardTitle>
              <CardDescription>
                View and reset team members' quick login PINs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <Crown className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> You cannot reset the Account Owner's PIN. Only they can change their own PIN.
            </p>
          </div>

          {/* Primary Owner Self-Edit Hint */}
          {isPrimaryOwner && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  <strong>Your PIN:</strong> As the Account Owner, you can manage your own PIN in your personal settings.
                </p>
                <Link 
                  to="/dashboard/admin/settings?category=system"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                >
                  Go to PIN Settings
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Team List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading team members...</p>
              ) : filteredMembers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No team members found</p>
              ) : (
                filteredMembers.map((member) => {
                  const isCurrentUser = member.user_id === user?.id;
                  const canReset = !member.is_primary_owner || isCurrentUser;

                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.photo_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {member.name?.slice(0, 2).toUpperCase() || <User className="w-4 h-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{member.name}</span>
                            {member.is_primary_owner && (
                              <Badge variant="outline" className="gap-1 text-warning border-warning/50">
                                <Crown className="w-3 h-3" />
                                Owner
                              </Badge>
                            )}
                            {member.is_super_admin && !member.is_primary_owner && (
                              <Badge variant="outline" className="gap-1 text-primary border-primary/50">
                                <Shield className="w-3 h-3" />
                                Super Admin
                              </Badge>
                            )}
                            {isCurrentUser && (
                              <Badge variant="secondary" className="text-xs">You</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            PIN: {member.has_pin ? 'Set' : 'Not set'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={member.has_pin ? 'default' : 'secondary'}>
                          {member.has_pin ? 'Active' : 'None'}
                        </Badge>
                        {canReset && (
                          <>
                            {!member.has_pin ? (
                              <Button
                                variant="outline"
                                size={tokens.button.card}
                                onClick={() => handleOpenResetDialog(member, 'set')}
                                className="gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Set PIN
                              </Button>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size={tokens.button.inline} className="gap-1.5">
                                    Manage
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenResetDialog(member, 'set')}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Change PIN
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleOpenResetDialog(member, 'clear')}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Clear PIN
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* PIN Change History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            PIN Change History
          </CardTitle>
          <CardDescription>
            Recent PIN changes across the organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {changelog.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No PIN changes recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Changed By</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changelog.slice(0, 10).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {formatDate(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell className="text-sm">{entry.changer_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.reason || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reset PIN Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionMode === 'clear' ? (
                <>
                  <Trash2 className="w-5 h-5" />
                  Clear PIN for {selectedMember?.name}
                </>
              ) : selectedMember?.has_pin ? (
                <>
                  <Pencil className="w-5 h-5" />
                  Change PIN for {selectedMember?.name}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Set PIN for {selectedMember?.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionMode === 'clear' 
                ? 'This will remove the PIN and disable quick login for this user.'
                : selectedMember?.has_pin 
                  ? 'Enter a new 4-digit PIN to replace the existing one.'
                  : 'Create a 4-digit PIN to enable quick login for this user.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionMode !== 'clear' && (
              <div className="space-y-2">
                <Label htmlFor="reset-pin">New PIN</Label>
                <div className="relative">
                  <Input
                    id="reset-pin"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    placeholder="Enter 4 digits"
                    className="pr-10 font-mono text-center text-lg tracking-widest"
                    autoCapitalize="off"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPin.length > 0 && newPin.length < 4 && (
                  <p className="text-xs text-muted-foreground">PIN must be exactly 4 digits</p>
                )}
              </div>
            )}

            {actionMode === 'clear' && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">
                  This user will no longer be able to use quick PIN login until a new PIN is set.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., User forgot PIN"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResetPin}
              disabled={(actionMode !== 'clear' && newPin.length > 0 && newPin.length < 4) || adminSetPin.isPending}
              variant={actionMode === 'clear' ? 'destructive' : 'default'}
            >
              {adminSetPin.isPending 
                ? 'Saving...' 
                : actionMode === 'clear' 
                  ? 'Clear PIN' 
                  : selectedMember?.has_pin 
                    ? 'Update PIN' 
                    : 'Set PIN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
