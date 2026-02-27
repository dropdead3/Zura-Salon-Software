import { cn } from '@/lib/utils';
import {
  User, Users, UserCheck, UserCog, UserPlus,
  Shield, ShieldCheck, Crown, Star, Award,
  Scissors, Sparkles, Heart, Gem, Zap,
  Phone, Headphones, MessageSquare, Mail, Bell,
  ClipboardList, FileText, Folder, Calendar, Clock,
  Settings, Wrench, Cog, Key, Lock,
  Briefcase, Building, Store, Home, MapPin,
  DollarSign, CreditCard, Receipt, PiggyBank, Wallet,
  Camera, Image, Palette, Brush, Wand2,
  LucideIcon,
} from 'lucide-react';
import BoothRentIcon from '@/components/icons/BoothRentIcon';

interface RoleIconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

// Icon map for dynamic lookup
const ICON_MAP: Record<string, LucideIcon> = {
  User, Users, UserCheck, UserCog, UserPlus,
  Shield, ShieldCheck, Crown, Star, Award,
  Scissors, Sparkles, Heart, Gem, Zap,
  Phone, Headphones, MessageSquare, Mail, Bell,
  ClipboardList, FileText, Folder, Calendar, Clock,
  Settings, Wrench, Cog, Key, Lock,
  Briefcase, Building, Store, Home, MapPin,
  DollarSign, CreditCard, Receipt, PiggyBank, Wallet,
  Camera, Image, Palette, Brush, Wand2,
  BoothRent: BoothRentIcon as unknown as LucideIcon,
};

const ROLE_ICONS = Object.keys(ICON_MAP);

export function RoleIconPicker({ value, onChange }: RoleIconPickerProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
        {ROLE_ICONS.map((iconName) => {
          const IconComponent = ICON_MAP[iconName];
          if (!IconComponent) return null;

          return (
            <button
              key={iconName}
              type="button"
              onClick={() => onChange(iconName)}
              className={cn(
                'p-2 rounded-lg transition-all flex items-center justify-center',
                value === iconName 
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                  : 'bg-muted hover:bg-muted/80'
              )}
              title={iconName}
            >
              <IconComponent className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Selected:</span>
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{value}</span>
      </div>
    </div>
  );
}

export function getRoleIconComponent(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || User;
}
