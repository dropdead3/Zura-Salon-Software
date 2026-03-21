import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Eye, AlertCircle, User } from 'lucide-react';
import { useWelcomeDMRules, WELCOME_TEMPLATE_VARIABLES, replaceTemplateVariables } from '@/hooks/team-chat/useWelcomeDMRules';
import { useRoleMembers } from '@/hooks/team-chat/useRoleMembers';
import { useRoleUtils } from '@/hooks/useRoleUtils';
import type { WelcomeRule } from '@/hooks/team-chat/useWelcomeDMRules';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface WelcomeSenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule: WelcomeRule | null;
}

// Leadership roles that can send welcome messages
const SENDER_ROLE_OPTIONS: { value: AppRole; label: string; description: string }[] = [
  { value: 'super_admin', label: 'Account Owner', description: 'Primary account holder' },
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'manager', label: 'Manager', description: 'Can manage team, view reports' },
];

const TARGET_ROLE_OPTIONS = [
  { value: 'stylist', label: 'Stylist' },
  { value: 'stylist_assistant', label: 'Stylist Assistant' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

const DELAY_OPTIONS = [
  { value: 0, label: 'Immediately' },
  { value: 60, label: '1 hour' },
  { value: 240, label: '4 hours' },
  { value: 1440, label: '24 hours' },
];

const DEFAULT_MESSAGE = "Welcome to the team, [new_member_name]! 👋 My name is [sender_name], and I'm here to help you get started. Feel free to message me anytime with questions!";

export function WelcomeSenderDialog({ open, onOpenChange, editingRule }: WelcomeSenderDialogProps) {
  const { rules, addRule, updateRule, isAdding, isUpdating } = useWelcomeDMRules();

  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_MESSAGE);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Get members who currently hold the selected role
  const { data: roleMembers, isLoading: loadingMembers } = useRoleMembers(selectedRole);

  // Filter out already configured roles (unless editing that role)
  const configuredRoles = rules.map(r => r.sender_role);
  const availableRoles = SENDER_ROLE_OPTIONS.filter(r =>
    !configuredRoles.includes(r.value) || editingRule?.sender_role === r.value
  );

  // Reset form when dialog opens/closes or editing rule changes
  useEffect(() => {
    if (open) {
      if (editingRule) {
        setSelectedRole(editingRule.sender_role);
        setMessageTemplate(editingRule.message_template);
        setTargetRoles(editingRule.target_roles || []);
        setDelayMinutes(editingRule.delay_minutes);
        setIsActive(editingRule.is_active);
      } else {
        setSelectedRole(null);
        setMessageTemplate(DEFAULT_MESSAGE);
        setTargetRoles([]);
        setDelayMinutes(0);
        setIsActive(true);
      }
      setShowPreview(false);
    }
  }, [open, editingRule]);

  const handleRoleToggle = (role: string, checked: boolean) => {
    setTargetRoles(prev =>
      checked ? [...prev, role] : prev.filter(r => r !== role)
    );
  };

  const insertVariable = (variable: string) => {
    setMessageTemplate(prev => prev + variable);
  };

  const handleSubmit = () => {
    if (!selectedRole || !messageTemplate.trim()) return;

    const input = {
      sender_role: selectedRole,
      message_template: messageTemplate.trim(),
      target_roles: targetRoles.length > 0 ? targetRoles : null,
      delay_minutes: delayMinutes,
      is_active: isActive,
    };

    if (editingRule) {
      updateRule({ id: editingRule.id, updates: input });
    } else {
      addRule(input);
    }

    onOpenChange(false);
  };

  const currentHolder = roleMembers?.[0];
  const previewMessage = replaceTemplateVariables(messageTemplate, {
    new_member_name: 'Jordan Smith',
    sender_name: currentHolder?.display_name?.split(' ')[0] || 'Team Member',
    role: 'Stylist',
    location_name: 'Downtown Salon',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingRule ? 'Edit Welcome Sender' : 'Add Welcome Sender'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-2">
            {/* Role Selection */}
            {!editingRule && (
              <div className="space-y-3">
                <Label>Select Sender Role</Label>
                <RadioGroup
                  value={selectedRole || ''}
                  onValueChange={(value) => setSelectedRole(value as AppRole)}
                  className="space-y-2"
                >
                  {availableRoles.map((role) => (
                    <div
                      key={role.value}
                      className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedRole === role.value
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedRole(role.value)}
                    >
                      <RadioGroupItem value={role.value} id={role.value} />
                      <div className="flex-1">
                        <Label htmlFor={role.value} className="font-medium cursor-pointer">
                          {role.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{role.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
                {availableRoles.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    All available sender roles have been configured.
                  </p>
                )}
              </div>
            )}

            {/* Selected Role Display (when editing) */}
            {editingRule && selectedRole && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">
                  {SENDER_ROLE_OPTIONS.find(r => r.value === selectedRole)?.label || selectedRole}
                </div>
                <p className="text-sm text-muted-foreground">
                  {SENDER_ROLE_OPTIONS.find(r => r.value === selectedRole)?.description}
                </p>
              </div>
            )}

            {/* Current Role Holder Preview */}
            {selectedRole && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Currently filling this role:</Label>
                {loadingMembers ? (
                  <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : roleMembers && roleMembers.length > 0 ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={currentHolder?.photo_url || undefined} />
                      <AvatarFallback>
                        {currentHolder?.display_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{currentHolder?.display_name}</span>
                    {roleMembers.length > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        +{roleMembers.length - 1} more
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-warning/10 text-warning rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">No one currently has this role</span>
                  </div>
                )}
              </div>
            )}

            {/* Message Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Message Template</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="h-7 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {showPreview ? 'Edit' : 'Preview'}
                </Button>
              </div>
              
              {showPreview ? (
                <div className="p-3 bg-muted rounded-md text-sm">
                  {previewMessage}
                </div>
              ) : (
                <>
                  <Textarea
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    placeholder="Write your welcome message..."
                    rows={4}
                  />
                  <div className="flex flex-wrap gap-1">
                    {WELCOME_TEMPLATE_VARIABLES.map((v) => (
                      <Button
                        key={v.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs font-mono"
                        onClick={() => insertVariable(v.key)}
                      >
                        {v.key}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Target Roles */}
            <div className="space-y-2">
              <Label>Send to (leave empty for all roles)</Label>
              <div className="flex flex-wrap gap-3">
                {TARGET_ROLE_OPTIONS.map((role) => (
                  <div key={role.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`target-role-${role.value}`}
                      checked={targetRoles.includes(role.value)}
                      onCheckedChange={(checked) => handleRoleToggle(role.value, !!checked)}
                    />
                    <Label htmlFor={`target-role-${role.value}`} className="text-sm font-normal cursor-pointer">
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Delay */}
            <div className="space-y-2">
              <Label>Send Delay</Label>
              <div className="flex flex-wrap gap-2">
                {DELAY_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={delayMinutes === opt.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDelayMinutes(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Disable to pause this welcome message
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || !messageTemplate.trim() || isAdding || isUpdating}
          >
            {editingRule ? 'Save Changes' : 'Add Sender'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
