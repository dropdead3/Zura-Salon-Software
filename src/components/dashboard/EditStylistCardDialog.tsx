import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, User, Eye, EyeOff, Calendar, Star, MapPin } from 'lucide-react';
import { useSpecialtyOptions } from '@/hooks/useSpecialtyOptions';
import { useLocations } from '@/hooks/useLocations';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';

interface StylistProfile {
  id: string;
  user_id: string;
  full_name: string;
  display_name: string | null;
  photo_url: string | null;
  instagram: string | null;
  tiktok?: string | null;
  stylist_level: string | null;
  specialties: string[] | null;
  highlighted_services?: string[] | null;
  location_id: string | null;
  location_ids?: string[] | null;
  bio?: string | null;
  is_booking: boolean | null;
  homepage_visible: boolean | null;
  homepage_order: number | null;
}

interface EditStylistCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stylist: StylistProfile | null;
}

const STYLIST_LEVELS = ['LEVEL 1', 'LEVEL 2', 'LEVEL 3', 'LEVEL 4'];

export function EditStylistCardDialog({ open, onOpenChange, stylist }: EditStylistCardDialogProps) {
  const queryClient = useQueryClient();
  const { data: specialtyOptions = [] } = useSpecialtyOptions();
  const { data: locations = [] } = useLocations();
  
  const [formData, setFormData] = useState({
    display_name: '',
    instagram: '',
    tiktok: '',
    stylist_level: '',
    specialties: [] as string[],
    highlighted_services: [] as string[],
    location_ids: [] as string[],
    bio: '',
    is_booking: true,
    homepage_visible: true,
  });

  useEffect(() => {
    if (stylist) {
      setFormData({
        display_name: stylist.display_name || '',
        instagram: stylist.instagram || '',
        tiktok: stylist.tiktok || '',
        stylist_level: stylist.stylist_level || '',
        specialties: stylist.specialties || [],
        highlighted_services: stylist.highlighted_services || [],
        location_ids: stylist.location_ids?.length ? stylist.location_ids : (stylist.location_id ? [stylist.location_id] : []),
        bio: stylist.bio || '',
        is_booking: stylist.is_booking ?? true,
        homepage_visible: stylist.homepage_visible ?? true,
      });
    }
  }, [stylist]);

  const updateStylist = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!stylist) return;
      
      const { error } = await supabase
        .from('employee_profiles')
        .update({
          display_name: data.display_name || null,
          instagram: data.instagram || null,
          tiktok: data.tiktok || null,
          stylist_level: data.stylist_level || null,
          specialties: data.specialties,
          highlighted_services: data.highlighted_services,
          location_id: data.location_ids[0] || null,
          location_ids: data.location_ids,
          bio: data.bio || null,
          is_booking: data.is_booking,
          homepage_visible: data.homepage_visible,
        })
        .eq('id', stylist.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-visible-stylists'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-stylists'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-pending-requests'] });
      toast.success('Stylist card updated');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating stylist:', error);
      toast.error('Failed to update stylist');
    },
  });

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => {
      const isSelected = prev.specialties.includes(specialty);
      const newSpecialties = isSelected
        ? prev.specialties.filter(s => s !== specialty)
        : prev.specialties.length < 3
          ? [...prev.specialties, specialty]
          : prev.specialties;
      
      // Also remove from highlighted if removed from specialties
      const newHighlighted = isSelected
        ? prev.highlighted_services.filter(s => s !== specialty)
        : prev.highlighted_services;
      
      return { ...prev, specialties: newSpecialties, highlighted_services: newHighlighted };
    });
  };

  const toggleHighlighted = (service: string) => {
    setFormData(prev => {
      const isSelected = prev.highlighted_services.includes(service);
      return {
        ...prev,
        highlighted_services: isSelected
          ? prev.highlighted_services.filter(s => s !== service)
          : prev.highlighted_services.length < 3
            ? [...prev.highlighted_services, service]
            : prev.highlighted_services,
      };
    });
  };

  const toggleLocation = (locationId: string) => {
    setFormData(prev => ({
      ...prev,
      location_ids: prev.location_ids.includes(locationId)
        ? prev.location_ids.filter(id => id !== locationId)
        : [...prev.location_ids, locationId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStylist.mutate(formData);
  };

  if (!stylist) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={stylist.photo_url || undefined} />
              <AvatarFallback><User className="w-5 h-5" /></AvatarFallback>
            </Avatar>
            Edit {stylist.full_name}'s Card
          </DialogTitle>
          <DialogDescription>
            Edit how this stylist appears on the homepage. Changes are linked to their profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Toggles */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {formData.homepage_visible ? (
                  <Eye className="w-4 h-4 text-primary" />
                ) : (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                )}
                <Label htmlFor="homepage_visible">Visible on Homepage</Label>
              </div>
              <Switch
                id="homepage_visible"
                checked={formData.homepage_visible}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, homepage_visible: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="is_booking">Accepting Bookings</Label>
              </div>
              <Switch
                id="is_booking"
                checked={formData.is_booking}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_booking: checked }))}
              />
            </div>
          </div>

          {/* Booking Status Preview */}
          <div className="p-3 border rounded-lg bg-background">
            <p className="text-xs text-muted-foreground mb-2">Button Preview:</p>
            <Button
              type="button"
              size={tokens.button.card}
              variant={formData.is_booking ? "default" : "secondary"}
              className={cn(!formData.is_booking && "opacity-60")}
              disabled
            >
              {formData.is_booking ? 'Book Consult →' : 'Not Booking'}
            </Button>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              placeholder={stylist.full_name}
            />
            <p className="text-xs text-muted-foreground">Leave blank to use their full name</p>
          </div>

          {/* Social Handles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                placeholder="@handle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input
                id="tiktok"
                value={formData.tiktok}
                onChange={(e) => setFormData(prev => ({ ...prev, tiktok: e.target.value }))}
                placeholder="@handle"
              />
            </div>
          </div>

          {/* Stylist Level */}
          <div className="space-y-2">
            <Label>Stylist Level</Label>
            <Select
              value={formData.stylist_level}
              onValueChange={(value) => setFormData(prev => ({ ...prev, stylist_level: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level..." />
              </SelectTrigger>
              <SelectContent>
                {STYLIST_LEVELS.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Locations */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              Locations
            </Label>
            <div className="flex flex-wrap gap-2">
              {locations.map(loc => {
                const isSelected = formData.location_ids.includes(loc.id);
                return (
                  <Badge
                    key={loc.id}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleLocation(loc.id)}
                  >
                    {loc.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Specialties */}
          <div className="space-y-2">
            <Label>Specialties <span className="text-xs text-muted-foreground">(select 2-3)</span></Label>
            <div className="flex flex-wrap gap-2">
              {specialtyOptions.map(option => {
                const isSelected = formData.specialties.includes(option.name);
                const isDisabled = !isSelected && formData.specialties.length >= 3;
                return (
                  <Badge
                    key={option.name}
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      "cursor-pointer transition-all",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => !isDisabled && toggleSpecialty(option.name)}
                  >
                    {option.name}
                  </Badge>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{formData.specialties.length}/3 selected</p>
          </div>

          {/* Highlighted Services (from specialties) */}
          {formData.specialties.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                Highlighted on Card <span className="text-xs text-muted-foreground">(badges shown on card)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {formData.specialties.map(specialty => {
                  const isSelected = formData.highlighted_services.includes(specialty);
                  const isDisabled = !isSelected && formData.highlighted_services.length >= 3;
                  return (
                    <Badge
                      key={specialty}
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        "cursor-pointer transition-all",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => !isDisabled && toggleHighlighted(specialty)}
                    >
                      {isSelected && <Star className="w-3 h-3 mr-1 fill-current" />}
                      {specialty}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{formData.highlighted_services.length}/3 highlighted</p>
            </div>
          )}

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Card Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value.slice(0, 200) }))}
              placeholder="Short bio shown on the flip side of the card..."
              className="min-h-[80px] resize-none"
            />
            <p className="text-xs text-muted-foreground">{formData.bio.length}/200 characters</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateStylist.isPending}>
              {updateStylist.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
