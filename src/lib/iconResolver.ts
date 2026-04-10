import { 
  Crown, 
  Shield, 
  ShieldCheck,
  Scissors, 
  Phone, 
  Settings, 
  ClipboardList, 
  Briefcase, 
  Store, 
  User,
  Users,
  UserCog,
  Star,
  Sparkles,
  Heart,
  Gem,
  Award,
  Target,
  TrendingUp,
  BarChart,
  Calendar,
  Clock,
  Bell,
  Mail,
  MessageSquare,
  Headphones,
  Palette,
  Camera,
  Eye,
  Lock,
  Key,
  Zap,
  Rocket,
  Flag,
  Bookmark,
  Tag,
  Folder,
  FileText,
  Globe,
  Search,
  Brain,
  MessageSquarePlus,
  UserCheck,
  GitMerge,
  UserPlus,
  Coins,
  type LucideIcon 
} from 'lucide-react';
import BoothRentIcon from '@/components/icons/BoothRentIcon';

/**
 * Map of icon name strings to Lucide React components.
 * This allows storing icon names in the database and resolving them to actual components.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  // Role-related icons
  Crown,
  Shield,
  ShieldCheck,
  Scissors,
  Phone,
  Settings,
  ClipboardList,
  Briefcase,
  Store,
  User,
  Users,
  UserCog,
  
  // Status/Achievement icons
  Star,
  Sparkles,
  Heart,
  Gem,
  Award,
  Target,
  TrendingUp,
  BarChart,
  
  // Time/Calendar icons
  Calendar,
  Clock,
  
  // Communication icons
  Bell,
  Mail,
  MessageSquare,
  Headphones,
  
  // Creative icons
  Palette,
  Camera,
  Eye,
  
  // Security icons
  Lock,
  Key,
  
  // Action icons
  Zap,
  Rocket,
  Flag,
  Bookmark,
  Tag,
  Folder,
  FileText,
  Globe,
  Search,
  Brain,
  MessageSquarePlus,
  UserCheck,
  GitMerge,
  UserPlus,
  Coins,
  BoothRent: BoothRentIcon as unknown as LucideIcon,
};

/**
 * Get a Lucide icon component by its name.
 * Falls back to User icon if the name is not found.
 * 
 * @param name - The name of the icon (must match a key in ICON_MAP)
 * @returns The Lucide icon component
 * 
 * @example
 * const Icon = getIconByName('Crown');
 * return <Icon className="w-4 h-4" />;
 */
export function getIconByName(name: string): LucideIcon {
  return ICON_MAP[name] || User;
}

/**
 * Get all available icon names for use in dropdowns/selectors.
 */
export function getAvailableIconNames(): string[] {
  return Object.keys(ICON_MAP);
}

/**
 * Check if an icon name is valid.
 */
export function isValidIconName(name: string): boolean {
  return name in ICON_MAP;
}
