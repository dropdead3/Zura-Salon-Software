import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Gift, Trophy, Star, Coffee, Clock, Sun, Car, Megaphone,
  Users, GraduationCap, Calendar, Crown, Shirt, CreditCard,
  Package, Scissors, Heart, Sparkles, Zap, Award, Medal,
  Utensils, Music, Ticket, Plane, Home, MoreHorizontal,
  Pencil, Copy, Trash2,
} from 'lucide-react';
import { REWARD_CATEGORIES } from './DefaultRewardTemplates';
import type { Reward } from '@/services/pointsService';

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

interface RewardConfigCardProps {
  reward: Reward & { icon?: string; is_featured?: boolean };
  onEdit: (reward: Reward) => void;
  onDuplicate: (reward: Reward) => void;
  onDelete: (reward: Reward) => void;
  onToggleActive: (reward: Reward, isActive: boolean) => void;
}

export function RewardConfigCard({
  reward,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
}: RewardConfigCardProps) {
  const Icon = ICON_MAP[reward.icon || 'gift'] || Gift;
  const category = REWARD_CATEGORIES.find(c => c.value === reward.category);
  const categoryColor = category?.color || '#6B7280';

  return (
    <Card className="relative group hover:border-primary/30 transition-colors">
      {reward.is_featured && (
        <Badge 
          className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-1.5"
        >
          Featured
        </Badge>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${categoryColor}15` }}
          >
            <Icon 
              className="w-6 h-6" 
              style={{ color: categoryColor }}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{reward.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {reward.description || 'No description'}
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {reward.points_cost} pts
              </Badge>
              {reward.quantity_available !== null && (
                <Badge variant="outline" className="text-xs">
                  {reward.quantity_available} left
                </Badge>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(reward)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(reward)}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(reward)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            {reward.is_active ? 'Active' : 'Inactive'}
          </span>
          <Switch 
            checked={reward.is_active} 
            onCheckedChange={(checked) => onToggleActive(reward, checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
