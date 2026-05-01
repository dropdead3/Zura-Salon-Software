import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Camera, Loader2, Save, User, Phone, Mail, Instagram, MapPin, AlertCircle, CheckCircle2, Circle, Globe, Clock, FileText, Calendar, Undo2, Cake, Sparkles, X, ChevronDown, Check, Lock, Info, Eye, ClipboardList, ArrowRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useEmployeeProfile, useUpdateEmployeeProfile, useUploadProfilePhoto } from '@/hooks/useEmployeeProfile';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveRoles, useEffectiveUserContext } from '@/hooks/useEffectiveUser';
import { useLocations, getClosedDaysArray } from '@/hooks/useLocations';
import { useLocationSchedules, useUpsertLocationSchedule } from '@/hooks/useLocationSchedules';
import { useSpecialtyOptions } from '@/hooks/useSpecialtyOptions';
import { useStylistLevels } from '@/hooks/useStylistLevels';
import { locations as staticLocations } from '@/data/stylists';
import { cn } from '@/lib/utils';
import { getAvatarStyle } from '@/lib/avatar-utils';
import { toast } from 'sonner';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { StylistFlipCard } from '@/components/home/StylistFlipCard';
import type { Stylist, Location } from '@/data/stylists';
import { LandingPageSettings } from '@/components/dashboard/settings/LandingPageSettings';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageCropModal } from '@/components/dashboard/ImageCropModal';
import { Upload } from 'lucide-react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { isStructurallyEqual } from '@/lib/stableStringify';


const DAYS_OF_WEEK = [
  { key: 'Mon', label: 'Monday' },
  { key: 'Tue', label: 'Tuesday' },
  { key: 'Wed', label: 'Wednesday' },
  { key: 'Thu', label: 'Thursday' },
  { key: 'Fri', label: 'Friday' },
  { key: 'Sat', label: 'Saturday' },
  { key: 'Sun', label: 'Sunday' },
];

const ADMIN_LEVEL_ROLES = ['super_admin', 'admin', 'manager', 'admin_assistant', 'bookkeeper', 'operations_assistant', 'receptionist'] as const;



// Ensure social handle starts with @
const formatSocialHandle = (value: string) => {
  // Remove any existing @ symbols and trim
  const clean = value.replace(/@/g, '').trim();
  
  // Return empty if nothing left
  if (!clean) return '';
  
  // Add @ prefix
  return `@${clean}`;
};

export default function MyProfile() {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();
  const { user, refreshRoles } = useAuth();
  const roles = useEffectiveRoles();
  const { isImpersonating, impersonatedUser } = useEffectiveUserContext();
  
  const { data: profile, isLoading } = useEmployeeProfile();
  const { data: locations = [] } = useLocations();
  const { data: existingSchedules } = useLocationSchedules();
  const { data: specialtyOptions = [] } = useSpecialtyOptions();
  const { data: stylistLevels = [] } = useStylistLevels();
  const upsertSchedule = useUpsertLocationSchedule();
  const updateProfile = useUpdateEmployeeProfile();
  const uploadPhoto = useUploadProfilePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedToast, setShowUnsavedToast] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageFile, setCropImageFile] = useState<File | null>(null);
  const { isComplete: isOnboardingComplete } = useOnboardingProgress();
  const queryClient = useQueryClient();
  
  // Role-based logic for admin vs stylist
  const isAdminLevel = roles.some(r => (ADMIN_LEVEL_ROLES as readonly string[]).includes(r));
  const hasStylistRole = roles.includes('stylist') || roles.includes('stylist_assistant');
  const isPureStylist = hasStylistRole && !isAdminLevel;
  const showProfessionalDetails = isPureStylist || (isAdminLevel && hasStylistRole);

  // Mutation to toggle stylist role
  const toggleStylistRole = useMutation({
    mutationFn: async (addRole: boolean) => {
      if (!user?.id) throw new Error('No user');
      if (addRole) {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: 'stylist' as any });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('role', 'stylist' as any);
        if (error) throw error;
      }
    },
    onSuccess: async (_, addRole) => {
      await queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      await queryClient.invalidateQueries({ queryKey: ['effective-user-roles'] });
      await refreshRoles();
      toast.success(addRole ? 'Stylist role added — you can now set up your professional profile.' : 'Stylist role removed.');
    },
    onError: (error) => {
      toast.error('Failed to update role: ' + error.message);
    },
  });

  // When impersonating, the page is read-only
  const isReadOnly = isImpersonating;

  const [formData, setFormData] = useState({
    full_name: '',
    display_name: '',
    email: '',
    phone: '',
    instagram: '',
    tiktok: '',
    preferred_social_handle: 'instagram' as 'instagram' | 'tiktok',
    birthday: '',
    hire_date: '',
    location_id: '',
    location_ids: [] as string[],
    stylist_level: '',
    specialties: [] as string[],
    highlighted_services: [] as string[],
    
    emergency_contact: '',
    emergency_phone: '',
    bio: '',
    work_days: [] as string[],
    is_onsite_staff: true,
    // Location-specific schedules: { locationId: ['Mon', 'Tue', ...] }
    location_schedules: {} as Record<string, string[]>,
  });

  const [initialFormData, setInitialFormData] = useState(formData);

  // Combined effect to load profile and schedules together
  useEffect(() => {
    if (profile) {
      // Support both old location_id and new location_ids
      const locationIds = profile.location_ids?.length 
        ? profile.location_ids 
        : profile.location_id 
          ? [profile.location_id] 
          : [];
      
      // Build location schedules from existing data
      const schedules: Record<string, string[]> = {};
      if (existingSchedules && existingSchedules.length > 0) {
        existingSchedules.forEach(schedule => {
          schedules[schedule.location_id] = schedule.work_days || [];
        });
      }
      
      const newFormData = {
        full_name: profile.full_name || '',
        display_name: profile.display_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        instagram: profile.instagram || '',
        tiktok: profile.tiktok || '',
        preferred_social_handle: ((profile as any).preferred_social_handle || 'instagram') as 'instagram' | 'tiktok',
        birthday: (profile as any).birthday || '',
        hire_date: profile.hire_date || '',
        location_id: profile.location_id || '',
        location_ids: locationIds,
        stylist_level: profile.stylist_level || '',
        specialties: (profile.specialties || []).map((s: string) => {
          const match = specialtyOptions?.find(opt => opt.name.toLowerCase() === s.toLowerCase());
          return match ? match.name : s;
        }),
        highlighted_services: ((profile as any).highlighted_services || []).map((s: string) => {
          const match = specialtyOptions?.find(opt => opt.name.toLowerCase() === s.toLowerCase());
          return match ? match.name : s;
        }).filter((s: string) => (profile.specialties || []).some((sp: string) => sp.toLowerCase() === s.toLowerCase())),
        
        emergency_contact: profile.emergency_contact || '',
        emergency_phone: profile.emergency_phone || '',
        bio: (profile as any).bio || '',
        work_days: profile.work_days || [],
        is_onsite_staff: (profile as any).is_onsite_staff ?? true,
        location_schedules: schedules,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
      setHasUnsavedChanges(false);
    }
  }, [profile, existingSchedules, specialtyOptions]);

  // Track changes and show toast (only when not in read-only mode)
  useEffect(() => {
    if (isReadOnly) return; // Don't track changes when impersonating
    
    const isChanged = !isStructurallyEqual(formData, initialFormData);
    setHasUnsavedChanges(isChanged);
    
    if (isChanged && !showUnsavedToast) {
      setShowUnsavedToast(true);
      toast.info('You have unsaved changes', {
        description: 'Remember to save your profile when you\'re done editing.',
        duration: 4000,
        id: 'unsaved-changes',
      });
    }
  }, [formData, initialFormData, showUnsavedToast, isReadOnly]);

  // Calculate profile completion
  const profileFields = useMemo(() => {
    const isStylist = roles.includes('stylist') || roles.includes('stylist_assistant');
    
    const fields = [
      { key: 'photo', label: 'Profile Photo', filled: !!profile?.photo_url },
      { key: 'full_name', label: 'Full Name', filled: !!formData.full_name },
      { key: 'email', label: 'Email', filled: !!formData.email },
      { key: 'phone', label: 'Phone', filled: !!formData.phone },
      { key: 'instagram', label: 'Instagram', filled: !!formData.instagram },
      { key: 'location_ids', label: 'Location', filled: formData.location_ids.length > 0 },
      // Work days only required for on-site staff
      ...(formData.is_onsite_staff ? [{ key: 'work_days', label: 'Work Days', filled: formData.work_days.length > 0 }] : []),
      { key: 'emergency_contact', label: 'Emergency Contact', filled: !!formData.emergency_contact },
      { key: 'emergency_phone', label: 'Emergency Phone', filled: !!formData.emergency_phone },
    ];

    if (isStylist) {
      fields.push(
        { key: 'stylist_level', label: 'Stylist Level', filled: !!formData.stylist_level },
        { key: 'specialties', label: 'Specialties', filled: formData.specialties.length > 0 }
      );
    }

    return fields;
  }, [formData, profile?.photo_url, roles]);

  const completionPercentage = useMemo(() => {
    const filledCount = profileFields.filter(f => f.filled).length;
    return Math.round((filledCount / profileFields.length) * 100);
  }, [profileFields]);

  const missingFields = profileFields.filter(f => !f.filled);

  const isStylistRole = roles.includes('stylist') || roles.includes('stylist_assistant');
  const isPhotoLocked = isStylistRole && !isAdminLevel;

  // Validation for required fields
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    
    if (!formData.full_name.trim()) errors.push('Full Name is required');
    if (!formData.email.trim()) errors.push('Email is required');
    if (!formData.phone.trim()) errors.push('Phone is required');
    if (formData.location_ids.length === 0) errors.push('At least one location is required');
    if (!formData.emergency_contact.trim()) errors.push('Emergency Contact is required');
    if (!formData.emergency_phone.trim()) errors.push('Emergency Phone is required');
    
    // Stylist-specific validation
    if (isStylistRole) {
      if (!formData.stylist_level) errors.push('Stylist Level is required');
      if (formData.specialties.length < 2) errors.push('At least 2 specialties are required');
      if (formData.specialties.length > 3) errors.push('Maximum 3 specialties allowed');
    }
    
    return errors;
  }, [formData, isStylistRole]);

  const isFormValid = validationErrors.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!isFormValid) {
      toast.error('Please fill in all required fields', {
        description: validationErrors.slice(0, 3).join(', ') + (validationErrors.length > 3 ? '...' : ''),
      });
      return;
    }
    
    // Save location schedules to the database - only for selected locations
    const schedulePromises = formData.location_ids
      .filter(locationId => formData.location_schedules[locationId] !== undefined)
      .map(locationId => 
        upsertSchedule.mutateAsync({ 
          locationId, 
          workDays: formData.location_schedules[locationId] || [] 
        })
      );
    
    try {
      if (schedulePromises.length > 0) {
        await Promise.all(schedulePromises);
      }
    } catch (error) {
      console.error('Error saving schedules:', error);
      toast.error('Failed to save work schedule');
      return; // Stop if schedules fail - they're important
    }
    
    // Build profile update object with ONLY valid database columns
    // Explicitly exclude location_schedules which is NOT a database column
    const profileUpdate = {
      full_name: formData.full_name,
      display_name: formData.display_name,
      email: formData.email,
      phone: formData.phone,
      instagram: formData.instagram,
      tiktok: formData.tiktok,
      preferred_social_handle: formData.preferred_social_handle,
      birthday: formData.birthday,
      hire_date: formData.hire_date || null,
      location_id: formData.location_id,
      location_ids: formData.location_ids,
      stylist_level: formData.stylist_level,
      specialties: formData.specialties,
      highlighted_services: formData.highlighted_services,
      
      emergency_contact: formData.emergency_contact,
      emergency_phone: formData.emergency_phone,
      bio: formData.bio,
      is_onsite_staff: formData.is_onsite_staff,
    };
    
    updateProfile.mutate(profileUpdate as any, {
      onSuccess: () => {
        setInitialFormData(formData);
        setHasUnsavedChanges(false);
        setShowUnsavedToast(false);
        toast.success('Profile saved successfully!');
      },
      onError: (error) => {
        console.error('Profile update error:', error);
        // Toast is already shown by the hook
      }
    });
  };

  const handlePhotoClick = () => {
    if (profile?.photo_url) {
      // Open crop modal with existing photo
      setCropImageFile(null);
      setCropModalOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropImageFile(file);
      setCropModalOpen(true);
    }
    e.target.value = '';
  };

  const handleCroppedPhotoUpload = async (blob: Blob, focalX: number, focalY: number, cardFocalX: number, cardFocalY: number, avatarZoom: number, avatarRotation: number, cardZoom: number, cardRotation: number) => {
    await uploadPhoto.mutateAsync({ input: blob, focalX, focalY, cardFocalX, cardFocalY, avatarZoom, avatarRotation, cardZoom, cardRotation });
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['employee-profile'] }),
      queryClient.refetchQueries({ queryKey: ['team-directory'] }),
      queryClient.refetchQueries({ queryKey: ['homepage-stylists'] }),
    ]);
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => {
      const isSelected = prev.specialties.includes(specialty);
      if (isSelected) {
        // Also remove from highlighted services if it was highlighted
        return { 
          ...prev, 
          specialties: prev.specialties.filter(s => s !== specialty),
          highlighted_services: prev.highlighted_services.filter(s => s !== specialty)
        };
      }
      return { ...prev, specialties: [...prev.specialties, specialty] };
    });
  };

  const toggleHighlightedService = (service: string) => {
    setFormData(prev => {
      const isSelected = prev.highlighted_services.includes(service);
      if (isSelected) {
        return { ...prev, highlighted_services: prev.highlighted_services.filter(s => s !== service) };
      }
      // Limit to 3 highlighted services
      if (prev.highlighted_services.length >= 3) {
        toast.error('You can select up to 3 highlighted services');
        return prev;
      }
      return { ...prev, highlighted_services: [...prev.highlighted_services, service] };
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-medium mb-2">
            {isReadOnly ? `${impersonatedUser?.full_name}'s Profile` : 'My Profile'}
          </h1>
          <p className="text-muted-foreground">
            {isReadOnly 
              ? 'You are viewing this profile in read-only mode.'
              : 'Manage your contact information and profile details.'
            }
          </p>
        </div>

        {/* Read-only warning when impersonating */}
        {isReadOnly && (
          <Alert className="mb-6 border-primary/50 bg-primary/5">
            <Eye className="h-4 w-4" />
            <AlertDescription>
              You are viewing {impersonatedUser?.full_name}'s profile. To edit a team member's profile, use the{' '}
              <a href={`/dashboard/admin/team/${impersonatedUser?.id}`} className="underline font-medium">
                View Profile
              </a>{' '}
              page from Team Overview.
            </AlertDescription>
          </Alert>
        )}

        {/* Profile Completion Card */}
        <Card className={cn(
          "mb-6 border-2",
          completionPercentage === 100 
            ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" 
            : "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <svg className="w-16 h-16 -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-muted/30"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(completionPercentage / 100) * 176} 176`}
                    className={completionPercentage === 100 ? "text-green-500" : "text-amber-500"}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                  {completionPercentage}%
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium flex items-center gap-2">
                  {completionPercentage === 100 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Profile Complete!
                    </>
                  ) : (
                    <>
                      Profile {completionPercentage}% Complete
                    </>
                  )}
                </h3>
                {missingFields.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-2">Missing fields:</p>
                    <div className="flex flex-wrap gap-1">
                      {missingFields.slice(0, 5).map(field => (
                        <Badge key={field.key} variant="outline" className="text-xs">
                          <Circle className="w-2 h-2 mr-1" />
                          {field.label}
                        </Badge>
                      ))}
                      {missingFields.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{missingFields.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Link - Only shows when onboarding is complete */}
        {isOnboardingComplete && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <Link 
                to={dashPath('/onboarding')}
                className="flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Onboarding Complete</p>
                    <p className="text-xs text-muted-foreground">View your onboarding checklist</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        )}

        <fieldset disabled={isReadOnly} className="space-y-6">
          {/* Photo Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-display text-base tracking-wide">
                        Profile Photo
                      </CardTitle>
                      {isPhotoLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <CardDescription>
                      {isPhotoLocked 
                        ? 'Your headshot is managed by admin and displayed on the website.'
                        : 'Your photo will be visible to the team and used across the platform.'
                      }
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isPhotoLocked ? (
                // Locked state for stylists/stylist assistants
                <div className="space-y-4">
                  <div className="flex items-center gap-6">
                    <Avatar className="w-24 h-24 ring-2 ring-muted">
                      <AvatarImage src={profile?.photo_url || undefined} alt={profile?.full_name} className="object-cover" style={getAvatarStyle(profile)} />
                      <AvatarFallback className="text-2xl bg-muted">
                        {formData.full_name?.charAt(0) || <User className="w-8 h-8" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Admin Managed</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your headshot is uploaded by admin after your professional photo session.
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-10">
                      <div className="flex items-start gap-2 flex-1">
                        <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p className="font-medium text-foreground">Photo Requirements</p>
                          <p>Your profile photo appears on the website stylist directory and must be a professional headshot.</p>
                          <p><span className="font-medium">Recommended:</span> 800×1000px (4:5 portrait ratio)</p>
                          <p><span className="font-medium">Minimum:</span> 400×500px, JPG or PNG format</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="shrink-0"
                        onClick={() => navigate(dashPath('/onboarding'))}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Headshot
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // Normal upload state for other roles
                <div className="flex flex-col items-center gap-4">
                  {profile?.photo_url ? (
                    <div className="relative group">
                      <Avatar className="w-28 h-28 ring-2 ring-border/40">
                        <AvatarImage src={profile.photo_url} alt={profile?.full_name} className="object-cover" style={getAvatarStyle(profile)} />
                        <AvatarFallback className="text-3xl bg-muted">
                          {formData.full_name?.charAt(0) || <User className="w-10 h-10" />}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={handlePhotoClick}
                        disabled={uploadPhoto.isPending}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                      >
                        {uploadPhoto.isPending ? (
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        ) : (
                          <Camera className="w-6 h-6 text-white" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => !uploadPhoto.isPending && handlePhotoClick()}
                      className="w-28 h-28 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors bg-muted/30"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Upload</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full px-4"
                      onClick={handlePhotoClick}
                      disabled={uploadPhoto.isPending}
                    >
                      {uploadPhoto.isPending ? 'Uploading...' : profile?.photo_url ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">JPG, PNG. Max 5MB.</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* Image Crop Modal */}
              <ImageCropModal
                open={cropModalOpen}
                onClose={() => setCropModalOpen(false)}
                imageFile={cropImageFile}
                imageUrl={profile?.photo_url || undefined}
                onCropComplete={handleCroppedPhotoUpload}
                initialFocalX={(profile as any)?.photo_focal_x ?? 50}
                initialFocalY={(profile as any)?.photo_focal_y ?? 50}
                initialCardFocalX={(profile as any)?.card_focal_x ?? 50}
                initialCardFocalY={(profile as any)?.card_focal_y ?? 50}
                initialAvatarZoom={(profile as any)?.avatar_zoom ?? 1}
                initialAvatarRotation={(profile as any)?.avatar_rotation ?? 0}
                initialCardZoom={(profile as any)?.card_zoom ?? 1}
                initialCardRotation={(profile as any)?.card_rotation ?? 0}
                cardPreviewProps={showProfessionalDetails ? {
                  name: formData.full_name,
                  displayName: formData.display_name,
                  level: formData.stylist_level,
                  instagram: formData.instagram,
                  tiktok: formData.tiktok,
                  preferredSocialHandle: formData.preferred_social_handle,
                  highlightedServices: formData.highlighted_services,
                  specialties: formData.specialties,
                  bio: formData.bio,
                  isBooking: profile?.is_booking !== false,
                  locations: formData.location_ids.map(id => {
                    const loc = locations.find(l => l.id === id);
                    return loc ? { id: loc.id, name: loc.name } : null;
                  }).filter(Boolean) as { id: string; name: string }[],
                } : undefined}
              />
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className={cn("pl-10", !formData.full_name.trim() && "border-destructive/50")}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name" className="leading-tight">
                    Nickname <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="If you don't go by your legal first name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className={cn("pl-10", !formData.email.trim() && "border-destructive/50")}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className={cn("pl-10", !formData.phone.trim() && "border-destructive/50")}
                      placeholder="555-123-4567"
                      maxLength={12}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                  <div className="flex items-center rounded-md border border-input bg-background">
                    <div className="flex items-center gap-1.5 pl-3 text-muted-foreground">
                      <Instagram className="w-4 h-4" />
                      <span className="text-sm font-medium">@</span>
                    </div>
                    <Input
                      id="instagram"
                      value={formData.instagram.replace(/^@/, '')}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^a-zA-Z0-9._]/g, '');
                        setFormData(prev => ({ ...prev, instagram: clean ? `@${clean}` : '' }));
                      }}
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pl-1"
                      placeholder="yourhandle"
                      autoCapitalize="none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok">TikTok <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                  <div className="flex items-center rounded-md border border-input bg-background">
                    <div className="flex items-center gap-1.5 pl-3 text-muted-foreground">
                      <svg 
                        className="w-4 h-4"
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                      >
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                      </svg>
                      <span className="text-sm font-medium">@</span>
                    </div>
                    <Input
                      id="tiktok"
                      value={formData.tiktok.replace(/^@/, '')}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^a-zA-Z0-9._]/g, '');
                        setFormData(prev => ({ ...prev, tiktok: clean ? `@${clean}` : '' }));
                      }}
                      className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pl-1"
                      placeholder="yourhandle"
                      autoCapitalize="none"
                    />
                  </div>
                </div>
              </div>

              {/* Preferred Social Handle for Card Display */}
              {(formData.instagram || formData.tiktok) && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Display on Stylist Card
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose which social handle appears on your public stylist card.
                  </p>
                  <div className="flex gap-2">
                    <Badge
                      variant={formData.preferred_social_handle === 'instagram' ? 'default' : 'outline'}
                      className={cn(
                        "cursor-pointer transition-all px-4 py-2",
                        !formData.instagram && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (formData.instagram) {
                          setFormData(prev => ({ ...prev, preferred_social_handle: 'instagram' }));
                        }
                      }}
                    >
                      <Instagram className="w-4 h-4 mr-2" />
                      Instagram
                      {formData.preferred_social_handle === 'instagram' && (
                        <Check className="w-3 h-3 ml-2" />
                      )}
                    </Badge>
                    <Badge
                      variant={formData.preferred_social_handle === 'tiktok' ? 'default' : 'outline'}
                      className={cn(
                        "cursor-pointer transition-all px-4 py-2",
                        !formData.tiktok && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (formData.tiktok) {
                          setFormData(prev => ({ ...prev, preferred_social_handle: 'tiktok' }));
                        }
                      }}
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                      </svg>
                      TikTok
                      {formData.preferred_social_handle === 'tiktok' && (
                        <Check className="w-3 h-3 ml-2" />
                      )}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Birthday & Start Date Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthday" className="flex items-center gap-2">
                    <Cake className="w-4 h-4 text-pink-500" />
                    Birthday
                  </Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your birthday appears on the team calendar.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hire_date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Start Date
                  </Label>
                  <Input
                    id="hire_date"
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    When you joined the team.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Locations <span className="text-destructive">*</span></Label>
                <div className="flex flex-wrap gap-2">
                  {locations.map(loc => {
                    const isSelected = formData.location_ids.includes(loc.id);
                    return (
                      <Badge
                        key={loc.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer transition-all"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            location_ids: isSelected
                              ? prev.location_ids.filter(id => id !== loc.id)
                              : [...prev.location_ids, loc.id],
                            // Keep location_id in sync with first selected location
                            location_id: isSelected 
                              ? prev.location_ids.filter(id => id !== loc.id)[0] || ''
                              : prev.location_id || loc.id,
                          }));
                        }}
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        {loc.name}
                      </Badge>
                    );
                  })}
                </div>
                {formData.location_ids.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Working at {formData.location_ids.length} locations
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* On-Site Staff Toggle - only for admin-level users */}
          {isAdminLevel && formData.location_ids.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label className="font-display text-base tracking-wide">I WORK ON-SITE</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable this if you work at a location during operating hours. This lets you set your preferred work schedule.
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_onsite_staff}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_onsite_staff: checked }))}
                    disabled={isReadOnly}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Work Days Selection - Per Location */}
          {formData.location_ids.length > 0 && (!isAdminLevel || formData.is_onsite_staff) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted flex items-center justify-center rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-display text-base tracking-wide">
                        Preferred Work Schedule
                      </CardTitle>
                      <MetricInfoTooltip description="Your work schedule controls when clients can book appointments with you at each location. Changes here are reflected on online scheduling." />
                    </div>
                    <CardDescription>
                      Select the days you typically work at each location. Days cannot overlap between locations.
                    </CardDescription>
                    <p className="text-xs text-muted-foreground mt-1">
                      These selections determine which days you are available for booking and will be reflected on online scheduling.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.location_ids.map(locationId => {
                  const location = locations.find(l => l.id === locationId);
                  if (!location) return null;

                  const currentSchedule = formData.location_schedules[locationId] || [];
                  
                  // Get all days used by OTHER locations
                  const usedByOtherLocations = Object.entries(formData.location_schedules)
                    .filter(([locId]) => locId !== locationId)
                    .flatMap(([, days]) => days);

                  // Get days when this location is closed
                  const closedDays = getClosedDaysArray(location.hours_json);

                  return (
                    <div key={locationId} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{location.name}</span>
                        {currentSchedule.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {currentSchedule.length} day{currentSchedule.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {closedDays.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Closed {closedDays.join(' & ')}
                          </span>
                        )}
                      </div>
                      {currentSchedule.length === 0 && (
                        <p className="text-xs text-amber-500">No days selected — you won't appear in bookings for this location.</p>
                      )}
                      <div className="grid grid-cols-7 gap-2">
                        {DAYS_OF_WEEK.map(day => {
                          const isSelected = currentSchedule.includes(day.key);
                          const isUsedElsewhere = usedByOtherLocations.includes(day.key);
                          const isLocationClosed = closedDays.includes(day.key);
                          const isDisabled = isUsedElsewhere || isLocationClosed;
                          
                          const otherLocation = isUsedElsewhere 
                            ? locations.find(l => 
                                l.id !== locationId && 
                                formData.location_schedules[l.id]?.includes(day.key)
                              )
                            : null;

                          // Build tooltip text
                          let tooltipText: string | undefined;
                          if (isLocationClosed) {
                            tooltipText = `${location.name} is closed on ${day.label}`;
                          } else if (isUsedElsewhere) {
                            tooltipText = `Already scheduled at ${otherLocation?.name}`;
                          }
                          
                          return (
                            <button
                              key={day.key}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => {
                                if (isDisabled) return;
                                setFormData(prev => ({
                                  ...prev,
                                  location_schedules: {
                                    ...prev.location_schedules,
                                    [locationId]: isSelected
                                      ? currentSchedule.filter(d => d !== day.key)
                                      : [...currentSchedule, day.key],
                                  },
                                }));
                              }}
                              title={tooltipText}
                              className={cn(
                                "flex flex-col items-center justify-center p-2.5 rounded-full border-2 transition-all text-xs",
                                isSelected && "border-primary bg-primary/10 text-primary font-medium",
                                !isSelected && !isDisabled && "border-border hover:border-primary/50",
                                isLocationClosed && "border-muted bg-muted/30 text-muted-foreground/50 cursor-not-allowed line-through",
                                isUsedElsewhere && !isLocationClosed && "border-muted bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                              )}
                            >
                              {day.key}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Total days summary */}
                {Object.values(formData.location_schedules).flat().length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Total: {Object.values(formData.location_schedules).flat().length} day{Object.values(formData.location_schedules).flat().length !== 1 ? 's' : ''} per week across all locations
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* "I Also Perform Services" Toggle - Only for admin-level users */}
          {isAdminLevel && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-display tracking-wide">I ALSO PERFORM SERVICES</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable this if you also work behind the chair. This adds stylist permissions and allows you to set up your professional profile.
                    </p>
                  </div>
                  <Switch
                    checked={hasStylistRole}
                    disabled={toggleStylistRole.isPending || isReadOnly}
                    onCheckedChange={(checked) => {
                      toggleStylistRole.mutate(checked);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Professional Info - For stylists and stylist assistants */}
          {showProfessionalDetails && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Professional Details</CardTitle>
                {(roles.includes('super_admin') || roles.includes('admin')) && (
                  <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                    <Link to={dashPath('/admin/website-hub')}>
                      Manage Specialties <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stylist_level">Stylist Level <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground">
                    Select the level found in your offer letter extended at hiring.
                  </p>
                  <Select
                    value={formData.stylist_level}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, stylist_level: value }))}
                  >
                    <SelectTrigger className={cn(!formData.stylist_level && "border-destructive/50")}>
                      <SelectValue placeholder="Select level..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stylistLevels.map(level => (
                        <SelectItem key={level.id} value={`${level.client_label.toUpperCase()} STYLIST`}>
                          {level.client_label} — {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label>
                    Specialties <span className="text-destructive">*</span>
                    <span className="text-muted-foreground text-xs font-normal ml-1">(select all that apply)</span>
                  </Label>
                  {(() => {
                    const categories = [...new Set(specialtyOptions.map(o => o.category))];
                    return categories.map(category => (
                      <div key={category} className="space-y-2">
                        <p className="text-xs font-display tracking-wide text-muted-foreground uppercase">{category}</p>
                        <div className="flex flex-wrap gap-2">
                          {specialtyOptions.filter(o => o.category === category).map(option => {
                            const specialty = option.name;
                            const isSelected = formData.specialties.includes(specialty);
                            
                            return (
                              <button
                                key={specialty}
                                type="button"
                                onClick={() => toggleSpecialty(specialty)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full border-2 text-sm transition-all flex items-center gap-1.5",
                                  isSelected && "border-primary bg-primary/10 text-primary font-medium",
                                  !isSelected && "border-border hover:border-primary/50 text-foreground",
                                )}
                              >
                                {specialty}
                                {isSelected && <X className="w-3 h-3 ml-0.5 opacity-60" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                  <p className="text-xs text-muted-foreground">
                    {formData.specialties.length} selected
                  </p>
                </div>

                {/* Highlighted Services for Website Card - uses specialty options */}
                <div className="space-y-2 pt-4 border-t">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Highlighted Services
                    <span className="text-muted-foreground text-xs font-normal">(select 2-3 from your specialties)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Tap a specialty below to highlight it on your website card. Choose up to 3 from your specialties above.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.specialties.map(specialty => {
                      const isSelected = formData.highlighted_services.includes(specialty);
                      const isDisabled = !isSelected && formData.highlighted_services.length >= 3;
                      return (
                        <button
                          key={specialty}
                          type="button"
                          onClick={() => !isDisabled && toggleHighlightedService(specialty)}
                          className={cn(
                            "px-3 py-1.5 rounded-full border-2 text-sm transition-all",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border border-dashed opacity-60 hover:border-primary/50 text-foreground",
                            isDisabled && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          {specialty}
                          {isSelected && <X className="w-3 h-3 ml-1 inline opacity-60" />}
                        </button>
                      );
                    })}
                  </div>
                  {formData.specialties.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Select specialties above first, then choose which to highlight.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formData.highlighted_services.length}/3 highlighted
                  </p>
                </div>

                {/* Bio for Website Card */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Website Bio
                  </Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value.slice(0, 200) }))}
                    placeholder="A short bio that appears when clients tap your card on the website (max 200 characters)"
                    className="min-h-[100px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.bio.length}/200 characters • This appears on the flip side of your stylist card on the website
                  </p>
                </div>


              </CardContent>
            </Card>
          )}

          {/* Stylist Card Preview - For stylists and stylist assistants */}
          {showProfessionalDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website Card Preview
                </CardTitle>
                <CardDescription>
                  See how your stylist card will appear on the website homepage as you fill in your information.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="w-64">
                  <StylistFlipCard
                    stylist={{
                      id: profile?.user_id || 'preview',
                      name: formData.full_name || 'Your Name',
                      displayName: formData.display_name || undefined,
                      level: formData.stylist_level || 'LEVEL 1 STYLIST',
                      imageUrl: profile?.photo_url || '',
                      instagram: formData.instagram || '',
                      tiktok: formData.tiktok || undefined,
                      preferred_social_handle: formData.preferred_social_handle,
                      specialties: formData.specialties,
                      highlighted_services: formData.highlighted_services,
                      bio: formData.bio || undefined,
                      isBooking: profile?.is_booking !== false,
                      locations: formData.location_ids.map(id => {
                        const loc = locations.find(l => l.id === id);
                        const staticLoc = staticLocations.find(sl => sl.id === id || sl.name === loc?.name);
                        return (staticLoc?.id || id) as Location;
                      }).filter(Boolean),
                      card_focal_x: (profile as any)?.card_focal_x ?? 50,
                      card_focal_y: (profile as any)?.card_focal_y ?? 50,
                    }}
                    index={0}
                    selectedLocation="all"
                    isPreview
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Homepage Visibility - Only for stylists with complete profiles */}
          {showProfessionalDetails && roles.includes('stylist') && (
            <Card className={cn(
              "border-2",
              profile?.homepage_visible 
                ? "border-green-500/50 bg-green-50/30 dark:bg-green-950/20"
                : profile?.homepage_requested
                  ? "border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20"
                  : ""
            )}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website Visibility
                </CardTitle>
                <CardDescription>
                  Request to have your stylist card displayed on the salon website homepage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {completionPercentage < 100 ? (
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Complete your profile first</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your profile must be 100% complete before you can request homepage visibility. 
                        You're currently at {completionPercentage}%.
                      </p>
                    </div>
                  </div>
                ) : profile?.homepage_visible ? (
                  <div className="flex items-start gap-3 p-4 bg-green-100/50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-green-800 dark:text-green-400">
                        You're visible on the website!
                      </p>
                      <p className="text-sm text-green-700/80 dark:text-green-400/70 mt-1">
                        Your stylist card is now displayed on the salon homepage. Clients can see your profile and book consultations with you.
                      </p>
                    </div>
                  </div>
                ) : profile?.homepage_requested ? (
                  <div className="flex items-start gap-3 p-4 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-amber-800 dark:text-amber-400">
                        Pending admin approval
                      </p>
                      <p className="text-sm text-amber-700/80 dark:text-amber-400/70 mt-1">
                        Your request to be featured on the homepage is being reviewed. An admin will approve it soon.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">Request Homepage Visibility</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Toggle this on to request that your stylist card be added to the website.
                      </p>
                    </div>
                    <Switch
                      checked={false}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateProfile.mutate({
                            homepage_requested: true,
                            homepage_requested_at: new Date().toISOString(),
                          }, {
                            onSuccess: () => {
                              toast.success('Homepage visibility requested! An admin will review your request.');
                            }
                          });
                        }
                      }}
                    />
                  </div>
                )}

                {/* Booking Status Toggle - only show if visible on homepage */}
                {profile?.homepage_visible && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">Currently Booking</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Toggle off if you're not accepting new clients right now.
                      </p>
                    </div>
                    <Switch
                      checked={profile?.is_booking ?? true}
                      onCheckedChange={(checked) => {
                        updateProfile.mutate({ is_booking: checked });
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                Emergency Contact
              </CardTitle>
              <CardDescription>Who should we contact in case of emergency?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Contact Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                    className={cn(!formData.emergency_contact.trim() && "border-destructive/50")}
                    placeholder="Emergency contact name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Contact Phone <span className="text-destructive">*</span></Label>
                  <Input
                    id="emergency_phone"
                    type="tel"
                    value={formData.emergency_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_phone: e.target.value }))}
                    className={cn(!formData.emergency_phone.trim() && "border-destructive/50")}
                    placeholder="555-123-4567"
                    maxLength={12}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Landing Page Settings - only show if not impersonating */}
          {!isReadOnly && (
            <LandingPageSettings />
          )}

        </fieldset>

        {/* Sticky Save Bar */}
        <AnimatePresence>
          {hasUnsavedChanges && !isReadOnly && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 p-4 md:pl-[280px]"
            >
              <div className="max-w-3xl mx-auto">
                <div className="bg-card/80 backdrop-blur-xl rounded-full shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)] border border-border/40 px-5 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                    <span className="text-sm font-medium text-warning-foreground dark:text-warning">You have unsaved changes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      onClick={() => {
                        setFormData(initialFormData);
                        setHasUnsavedChanges(false);
                        setShowUnsavedToast(false);
                        toast.info('Changes discarded');
                      }}
                    >
                      <Undo2 className="w-4 h-4 mr-1" />
                      Discard
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full bg-foreground text-background hover:bg-foreground/80 transition-colors"
                      disabled={updateProfile.isPending || upsertSchedule.isPending}
                      onClick={(e) => handleSubmit(e as any)}
                    >
                      {(updateProfile.isPending || upsertSchedule.isPending) ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      Save Now
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
