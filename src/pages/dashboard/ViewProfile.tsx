import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Camera, Loader2, Save, User, Phone, Mail, Instagram, MapPin, AlertCircle, 
  CheckCircle2, Circle, Globe, Clock, FileText, Calendar, Undo2, Cake, Star, X,
  ArrowLeft, Shield, ShieldCheck
} from 'lucide-react';
import { useUserProfile, useUserRoles, useUserLocationSchedules, useUpdateUserProfile, useUpsertUserLocationSchedule, useUploadUserProfilePhoto } from '@/hooks/useAdminProfile';
import { useSpecialtyOptions } from '@/hooks/useSpecialtyOptions';
import { useEmployeeProfile } from '@/hooks/useEmployeeProfile';
import { useLocations, getClosedDaysArray } from '@/hooks/useLocations';
import { cn } from '@/lib/utils';
import { getAvatarStyle } from '@/lib/avatar-utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { AssistantRequestHistoryCard } from '@/components/dashboard/AssistantRequestHistoryCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PageExplainer } from '@/components/ui/PageExplainer';


const DAYS_OF_WEEK = [
  { key: 'Mon', label: 'Monday' },
  { key: 'Tue', label: 'Tuesday' },
  { key: 'Wed', label: 'Wednesday' },
  { key: 'Thu', label: 'Thursday' },
  { key: 'Fri', label: 'Friday' },
  { key: 'Sat', label: 'Saturday' },
  { key: 'Sun', label: 'Sunday' },
];

const stylistLevels = ['LEVEL 1', 'LEVEL 2', 'LEVEL 3', 'LEVEL 4'];

// specialtyOptions now fetched from DB inside the component

// allServiceNames is now fetched from DB inside the component

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  stylist: 'Stylist',
  receptionist: 'Receptionist',
  assistant: 'Assistant',
  stylist_assistant: 'Stylist Assistant',
  admin_assistant: 'Admin Assistant',
  operations_assistant: 'Operations Assistant',
};


const formatSocialHandle = (value: string) => {
  const clean = value.replace(/@/g, '').trim();
  if (!clean) return '';
  return `@${clean}`;
};

export default function ViewProfile() {
  const { dashPath } = useOrgDashboardPath();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  // Verify current user is super admin
  const { data: currentUserProfile, isLoading: currentUserLoading } = useEmployeeProfile();
  
  // Fetch target user data
  const { data: profile, isLoading: profileLoading } = useUserProfile(userId);
  const { data: userRoles = [], isLoading: rolesLoading } = useUserRoles(userId);
  const { data: existingSchedules = [] } = useUserLocationSchedules(userId);
  const { data: locations = [] } = useLocations();
  const { data: specialtyOptionsData = [] } = useSpecialtyOptions();
  const specialtyOptions = specialtyOptionsData.map(o => o.name);
  
  // Fetch all service names from DB for highlighted services picker
  const { data: allServiceNames = [] } = useQuery({
    queryKey: ['all-service-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data.map(s => s.name);
    },
  });
  
  // Mutations
  const updateProfile = useUpdateUserProfile(userId);
  const upsertSchedule = useUpsertUserLocationSchedule(userId);
  const uploadPhoto = useUploadUserProfilePhoto(userId);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedToast, setShowUnsavedToast] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    display_name: '',
    email: '',
    phone: '',
    instagram: '',
    tiktok: '',
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
    location_schedules: {} as Record<string, string[]>,
  });

  const [initialFormData, setInitialFormData] = useState(formData);

  // Role-based section visibility
  const isStylist = userRoles.includes('stylist') || userRoles.includes('stylist_assistant');
  const isAssistant = userRoles.some(r => r.includes('assistant'));
  const isAdmin = userRoles.includes('admin') || userRoles.includes('manager');

  // Load profile data
  useEffect(() => {
    if (profile) {
      const locationIds = profile.location_ids?.length 
        ? profile.location_ids 
        : profile.location_id 
          ? [profile.location_id] 
          : [];
      
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
        birthday: (profile as any).birthday || '',
        hire_date: profile.hire_date || '',
        location_id: profile.location_id || '',
        location_ids: locationIds,
        stylist_level: profile.stylist_level || '',
        specialties: profile.specialties || [],
        highlighted_services: (profile as any).highlighted_services || [],
        
        emergency_contact: profile.emergency_contact || '',
        emergency_phone: profile.emergency_phone || '',
        bio: (profile as any).bio || '',
        work_days: profile.work_days || [],
        location_schedules: schedules,
      };
      setFormData(newFormData);
      setInitialFormData(newFormData);
      setHasUnsavedChanges(false);
    }
  }, [profile, existingSchedules]);

  // Track changes
  useEffect(() => {
    const isChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setHasUnsavedChanges(isChanged);
    
    if (isChanged && !showUnsavedToast) {
      setShowUnsavedToast(true);
      toast.info('You have unsaved changes', {
        description: 'Remember to save the profile when you\'re done editing.',
        duration: 4000,
        id: 'unsaved-changes',
      });
    }
  }, [formData, initialFormData, showUnsavedToast]);

  // Calculate profile completion based on role
  const profileFields = useMemo(() => {
    const fields = [
      { key: 'photo', label: 'Profile Photo', filled: !!profile?.photo_url },
      { key: 'full_name', label: 'Full Name', filled: !!formData.full_name },
      { key: 'display_name', label: 'Display Name', filled: !!formData.display_name },
      { key: 'email', label: 'Email', filled: !!formData.email },
      { key: 'phone', label: 'Phone', filled: !!formData.phone },
      { key: 'instagram', label: 'Instagram', filled: !!formData.instagram },
      { key: 'location_ids', label: 'Location', filled: formData.location_ids.length > 0 },
      { key: 'work_days', label: 'Work Days', filled: Object.values(formData.location_schedules).flat().length > 0 },
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
  }, [formData, profile?.photo_url, isStylist]);

  const completionPercentage = useMemo(() => {
    const filledCount = profileFields.filter(f => f.filled).length;
    return Math.round((filledCount / profileFields.length) * 100);
  }, [profileFields]);

  const missingFields = profileFields.filter(f => !f.filled);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      return;
    }
    
    const profileUpdate = {
      full_name: formData.full_name,
      display_name: formData.display_name,
      email: formData.email,
      phone: formData.phone,
      instagram: formData.instagram,
      tiktok: formData.tiktok,
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
    };
    
    updateProfile.mutate(profileUpdate as any, {
      onSuccess: () => {
        setInitialFormData(formData);
        setHasUnsavedChanges(false);
        setShowUnsavedToast(false);
        toast.success('Profile saved successfully!');
      },
    });
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPhoto.mutate({ file });
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => {
      const isSelected = prev.specialties.includes(specialty);
      if (isSelected) {
        return { ...prev, specialties: prev.specialties.filter(s => s !== specialty) };
      }
      if (prev.specialties.length >= 4) {
        toast.error('Maximum 4 specialties allowed');
        return prev;
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
      if (prev.highlighted_services.length >= 3) {
        toast.error('Maximum 3 highlighted services allowed');
        return prev;
      }
      return { ...prev, highlighted_services: [...prev.highlighted_services, service] };
    });
  };

  const isLoading = currentUserLoading || profileLoading || rolesLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  // Check super admin access
  if (!currentUserProfile?.is_super_admin) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto">
          <Card className="border-destructive">
            <CardContent className="p-8 text-center">
              <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
              <h2 className="text-lg font-medium mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                Only super admins can view and edit team member profiles.
              </p>
              <Button onClick={() => navigate(dashPath('/directory'))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Directory
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The requested user profile could not be found.
              </p>
              <Button onClick={() => navigate(dashPath('/directory'))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Directory
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <DashboardPageHeader
            title={profile.display_name || profile.full_name}
            description="Editing profile as Super Admin"
          />
        <PageExplainer pageId="my-profile" />
          
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile.photo_url || undefined} alt={profile.full_name} className="object-cover" style={getAvatarStyle(profile)} />
              <AvatarFallback className="text-xl bg-muted">
                {profile.full_name?.charAt(0) || <User className="w-8 h-8" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-display font-medium">
                  {profile.display_name || profile.full_name}
                </h1>
                {profile.is_super_admin && (
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {userRoles.map(role => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {roleLabels[role] || role}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Editing profile as Super Admin
              </p>
            </div>
          </div>
        </div>

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
                  <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
                  <circle
                    cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4"
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
                    <>Profile {completionPercentage}% Complete</>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profile?.photo_url || undefined} alt={profile?.full_name} className="object-cover" style={getAvatarStyle(profile)} />
                    <AvatarFallback className="text-2xl bg-muted">
                      {formData.full_name?.charAt(0) || <User className="w-8 h-8" />}
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <Button type="button" variant="outline" onClick={handlePhotoClick} disabled={uploadPhoto.isPending}>
                    {uploadPhoto.isPending ? 'Uploading...' : 'Change Photo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, PNG. Max 5MB.</p>
                </div>
              </div>
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
                  <Label htmlFor="full_name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="pl-10"
                      placeholder="Full name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Display name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-10"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="pl-10"
                      placeholder="555-123-4567"
                      maxLength={12}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="instagram"
                      value={formData.instagram}
                      onChange={(e) => setFormData(prev => ({ ...prev, instagram: formatSocialHandle(e.target.value) }))}
                      className="pl-10"
                      placeholder="@handle"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input
                    id="tiktok"
                    value={formData.tiktok}
                    onChange={(e) => setFormData(prev => ({ ...prev, tiktok: formatSocialHandle(e.target.value) }))}
                    placeholder="@handle"
                  />
                </div>
              </div>

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
                </div>
              </div>

              <div className="space-y-2">
                <Label>Locations</Label>
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
              </div>
            </CardContent>
          </Card>

          {/* Work Schedule - Per Location */}
          {formData.location_ids.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Work Schedule
                </CardTitle>
                <CardDescription>
                  Days worked at each location
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.location_ids.map(locationId => {
                  const location = locations.find(l => l.id === locationId);
                  if (!location) return null;

                  const currentSchedule = formData.location_schedules[locationId] || [];
                  const usedByOtherLocations = Object.entries(formData.location_schedules)
                    .filter(([locId]) => locId !== locationId)
                    .flatMap(([, days]) => days);
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
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {DAYS_OF_WEEK.map(day => {
                          const isSelected = currentSchedule.includes(day.key);
                          const isUsedElsewhere = usedByOtherLocations.includes(day.key);
                          const isLocationClosed = closedDays.includes(day.key);
                          const isDisabled = isUsedElsewhere || isLocationClosed;
                          
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
                              className={cn(
                                "flex flex-col items-center justify-center p-2.5 rounded-lg border-2 transition-all text-xs",
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
              </CardContent>
            </Card>
          )}

          {/* Stylist/Stylist Assistant Professional Details */}
          {isStylist && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Professional Details</CardTitle>
                <CardDescription>Stylist-specific information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stylist_level">Stylist Level</Label>
                  <Select
                    value={formData.stylist_level}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, stylist_level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stylistLevels.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Specialties <span className="text-muted-foreground text-xs font-normal">(up to 4)</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {specialtyOptions.map(specialty => {
                      const isSelected = formData.specialties.includes(specialty);
                      const isDisabled = !isSelected && formData.specialties.length >= 4;
                      return (
                        <Badge
                          key={specialty}
                          variant={isSelected ? 'default' : 'outline'}
                          className={cn("cursor-pointer transition-all", isDisabled && "opacity-50 cursor-not-allowed")}
                          onClick={() => !isDisabled && toggleSpecialty(specialty)}
                        >
                          {specialty}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Highlighted Services <span className="text-muted-foreground text-xs font-normal">(up to 3)</span>
                  </Label>
                  <Select value="" onValueChange={(value) => toggleHighlightedService(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Add services..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {allServiceNames.filter(s => !formData.highlighted_services.includes(s)).map(service => (
                        <SelectItem key={service} value={service}>{service}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.highlighted_services.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.highlighted_services.map(service => (
                        <Badge key={service} variant="default" className="cursor-pointer pr-1 gap-1" onClick={() => toggleHighlightedService(service)}>
                          {service}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Website Bio
                  </Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value.slice(0, 200) }))}
                    placeholder="Short bio for website (max 200 characters)"
                    className="min-h-[100px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">{formData.bio.length}/200 characters</p>
                </div>

              </CardContent>
            </Card>
          )}

          {/* Homepage Visibility - Only for stylists */}
          {userRoles.includes('stylist') && (
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">Visible on Homepage</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Stylist card is shown on the website.
                    </p>
                  </div>
                  <Switch
                    checked={profile?.homepage_visible ?? false}
                    onCheckedChange={(checked) => {
                      updateProfile.mutate({ homepage_visible: checked });
                    }}
                  />
                </div>

                {profile?.homepage_visible && (
                  <>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">Currently Booking</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Accepting new clients.
                        </p>
                      </div>
                      <Switch
                        checked={profile?.is_booking ?? true}
                        onCheckedChange={(checked) => {
                          updateProfile.mutate({ is_booking: checked });
                        }}
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">Lead Pool Eligible</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Receive new client leads from the salon lead pool.
                    </p>
                  </div>
                  <Switch
                    checked={profile?.lead_pool_eligible ?? true}
                    onCheckedChange={(checked) => {
                      updateProfile.mutate({ lead_pool_eligible: checked });
                    }}
                  />
                </div>
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
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Contact Name</Label>
                  <Input
                    id="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                    placeholder="Emergency contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Contact Phone</Label>
                  <Input
                    id="emergency_phone"
                    type="tel"
                    value={formData.emergency_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_phone: e.target.value }))}
                    placeholder="(480) 555-1234"
                  />
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Assistant Request History - show for assistants */}
          {isAssistant && userId && (
            <AssistantRequestHistoryCard userId={userId} />
          )}
        </form>

        {/* Sticky Save Bar */}
        <AnimatePresence>
          {hasUnsavedChanges && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 p-4 md:pl-[280px]"
            >
              <div className="max-w-3xl mx-auto">
                <div className="bg-primary text-primary-foreground rounded-xl shadow-lg px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary-foreground/80 animate-pulse" />
                    <span className="text-sm font-medium">You have unsaved changes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
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
                      variant="secondary"
                      className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                      disabled={updateProfile.isPending || upsertSchedule.isPending}
                      onClick={(e) => handleSubmit(e as any)}
                    >
                      {(updateProfile.isPending || upsertSchedule.isPending) ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      Save
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
