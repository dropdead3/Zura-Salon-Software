import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { REWARD_CATEGORIES, REWARD_ICONS } from './DefaultRewardTemplates';
import type { Reward } from '@/services/pointsService';
import {
  Gift, Trophy, Star, Coffee, Clock, Sun, Car, Megaphone,
  Users, GraduationCap, Calendar, Crown, Shirt, CreditCard,
  Package, Scissors, Heart, Sparkles, Zap, Award, Medal,
  Utensils, Music, Ticket, Plane, Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  gift: Gift,
  trophy: Trophy,
  star: Star,
  coffee: Coffee,
  clock: Clock,
  sun: Sun,
  car: Car,
  megaphone: Megaphone,
  users: Users,
  'graduation-cap': GraduationCap,
  calendar: Calendar,
  crown: Crown,
  shirt: Shirt,
  'credit-card': CreditCard,
  package: Package,
  scissors: Scissors,
  heart: Heart,
  sparkles: Sparkles,
  zap: Zap,
  award: Award,
  medal: Medal,
  utensils: Utensils,
  music: Music,
  ticket: Ticket,
  plane: Plane,
  home: Home,
};

interface RewardFormData {
  name: string;
  description: string;
  category: string;
  points_cost: number;
  quantity_available: number | null;
  icon: string;
  is_featured: boolean;
  is_active: boolean;
  image_url: string;
}

interface RewardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reward?: Reward & { icon?: string; is_featured?: boolean } | null;
  onSubmit: (data: RewardFormData) => Promise<void>;
  isLoading?: boolean;
}

export function RewardFormDialog({
  open,
  onOpenChange,
  reward,
  onSubmit,
  isLoading,
}: RewardFormDialogProps) {
  const [formData, setFormData] = useState<RewardFormData>({
    name: '',
    description: '',
    category: 'merchandise',
    points_cost: 100,
    quantity_available: null,
    icon: 'gift',
    is_featured: false,
    is_active: true,
    image_url: '',
  });

  const isEdit = !!reward;

  useEffect(() => {
    if (reward) {
      setFormData({
        name: reward.name,
        description: reward.description || '',
        category: reward.category || 'merchandise',
        points_cost: reward.points_cost,
        quantity_available: reward.quantity_available,
        icon: reward.icon || 'gift',
        is_featured: reward.is_featured || false,
        is_active: reward.is_active,
        image_url: reward.image_url || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'merchandise',
        points_cost: 100,
        quantity_available: null,
        icon: 'gift',
        is_featured: false,
        is_active: true,
        image_url: '',
      });
    }
  }, [reward, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? 'EDIT REWARD' : 'CREATE REWARD'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this reward in your catalog.' : 'Add a new reward to your catalog.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Extra Break Time"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what team members get with this reward..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REWARD_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="points_cost">Points Cost *</Label>
              <Input
                id="points_cost"
                type="number"
                min={1}
                value={formData.points_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, points_cost: parseInt(e.target.value) || 0 }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity Available</Label>
            <Input
              id="quantity"
              type="number"
              min={0}
              value={formData.quantity_available ?? ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                quantity_available: e.target.value ? parseInt(e.target.value) : null 
              }))}
              placeholder="Leave empty for unlimited"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for unlimited availability
            </p>
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-1.5 p-2 bg-muted/30 rounded-lg border max-h-32 overflow-y-auto">
              {REWARD_ICONS.map((iconName) => {
                const Icon = ICON_MAP[iconName] || Gift;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, icon: iconName }))}
                    className={cn(
                      "p-2 rounded-md transition-colors",
                      formData.icon === iconName 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="featured">Featured Reward</Label>
                <p className="text-xs text-muted-foreground">
                  Highlight this reward in the shop
                </p>
              </div>
              <Switch
                id="featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Make this reward available for redemption
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Reward'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
