import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeProfile, useUpdateEmployeeProfile, useUploadProfilePhoto } from '@/hooks/useEmployeeProfile';
import { cn } from '@/lib/utils';
import { Camera, Loader2, Save, User, Crown, Shield, Headphones, Code } from 'lucide-react';
import { PlatformBadge } from '@/components/platform/ui/PlatformBadge';
import type { PlatformRole } from '@/hooks/usePlatformRoles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '@/components/platform/ui/PlatformCard';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import { OnlineIndicator } from '@/components/platform/ui/OnlineIndicator';

const roleConfig: Record<PlatformRole, { label: string; icon: React.ElementType; variant: 'warning' | 'info' | 'success' | 'primary' }> = {
  platform_owner: { label: 'Owner', icon: Crown, variant: 'warning' },
  platform_admin: { label: 'Admin', icon: Shield, variant: 'info' },
  platform_support: { label: 'Support', icon: Headphones, variant: 'success' },
  platform_developer: { label: 'Developer', icon: Code, variant: 'primary' },
};

export function PlatformAccountTab() {
  const { user, platformRoles } = useAuth();
  const { data: profile, isLoading } = useEmployeeProfile();
  const updateProfile = useUpdateEmployeeProfile();
  const uploadPhoto = useUploadProfilePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const primaryRole = platformRoles[0] as PlatformRole | undefined;
  const roleInfo = primaryRole ? roleConfig[primaryRole] : null;

  const [formData, setFormData] = useState({
    full_name: '',
    display_name: '',
    phone: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        display_name: profile.display_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => { updateProfile.mutate(formData); };
  const handlePhotoClick = () => { fileInputRef.current?.click(); };
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadPhoto.mutate({ input: file });
  };

  const getInitials = () => {
    const name = formData.full_name || formData.display_name || user?.email;
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const hasChanges = profile && (
    formData.full_name !== (profile.full_name || '') ||
    formData.display_name !== (profile.display_name || '') ||
    formData.phone !== (profile.phone || '')
  );

  if (isLoading) {
    return (
      <PlatformCard variant="glass">
        <PlatformCardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--platform-primary))]" />
        </PlatformCardContent>
      </PlatformCard>
    );
  }

  return (
    <PlatformCard variant="glass">
      <PlatformCardHeader>
        <PlatformCardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-[hsl(var(--platform-primary))]" />
          Account Settings
        </PlatformCardTitle>
        <PlatformCardDescription>
          Manage your platform profile and preferences
        </PlatformCardDescription>
      </PlatformCardHeader>
      <PlatformCardContent>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Photo Upload Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-[hsl(var(--platform-border))]">
                <AvatarImage src={profile?.photo_url || undefined} alt="Profile photo" />
                <AvatarFallback className="text-xl font-medium bg-[hsl(var(--platform-bg-card))] text-[hsl(var(--platform-foreground)/0.85)]">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              <OnlineIndicator 
                isOnline={true} 
                size="lg" 
                className="absolute bottom-1 right-1"
              />
              
              <button
                onClick={handlePhotoClick}
                disabled={uploadPhoto.isPending}
                className={cn(
                  'absolute inset-0 rounded-full flex items-center justify-center',
                  'bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity',
                  'cursor-pointer disabled:cursor-not-allowed'
                )}
              >
                {uploadPhoto.isPending ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
              
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
              Click to upload photo
            </p>
            
            {roleInfo && (
              <PlatformBadge variant={roleInfo.variant} size="lg" className="gap-1.5 mt-2">
                <roleInfo.icon className="w-3.5 h-3.5" />
                {roleInfo.label}
              </PlatformBadge>
            )}
          </div>

          {/* Form Fields */}
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <PlatformLabel htmlFor="full_name">Full Name</PlatformLabel>
                <PlatformInput
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <PlatformLabel htmlFor="display_name">Display Name</PlatformLabel>
                <PlatformInput
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => handleInputChange('display_name', e.target.value)}
                  placeholder="Preferred name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <PlatformLabel>Email</PlatformLabel>
              <PlatformInput
                value={user?.email || ''}
                disabled
                className="opacity-60 cursor-not-allowed"
              />
              <p className="text-xs text-[hsl(var(--platform-foreground-subtle))]">
                Email is linked to your account and cannot be changed here
              </p>
            </div>

            <div className="space-y-2">
              <PlatformLabel htmlFor="phone">Phone</PlatformLabel>
              <PlatformInput
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="pt-4">
              <PlatformButton
                onClick={handleSave}
                disabled={!hasChanges || updateProfile.isPending}
                className="gap-2"
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </PlatformButton>
            </div>
          </div>
        </div>
      </PlatformCardContent>
    </PlatformCard>
  );
}