import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Type,
  Image,
  Square,
  Minus,
  MousePointerClick,
  Trash2,
  GripVertical,
  Plus,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronUp,
  ChevronDown,
  Code,
  Eye,
  Palette,
  Variable,
  Upload,
  Loader2,
  Save,
  Sparkles,
  Link,
  Copy,
  Undo2,
  Redo2,
  Share2,
  Instagram,
  Mail,
  LayoutTemplate,
  Pencil,
  Crown,
  Search,
  X,
  PenTool,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Columns2,
  Columns3,
  Rows2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { ColorWheelPicker } from '@/components/ui/color-wheel-picker';
import { ImageCropModal } from './ImageCropModal';
import { useSignaturePresets, SignatureConfig } from '@/hooks/useSignaturePresets';
import { SignaturePresetActions } from './SignaturePresetActions';

// Import brand logos - black versions
import brandLogoPrimary from '@/assets/brand-logo-primary.svg';
import brandLogoSecondary from '@/assets/brand-logo-secondary.svg';
import brandIcon from '@/assets/brand-icon.svg';
import brandWordmark from '@/assets/brand-wordmark.svg';
// Import brand logos - white versions
import brandLogoPrimaryWhite from '@/assets/brand-logo-primary-white.svg';
import brandLogoSecondaryWhite from '@/assets/brand-logo-secondary-white.svg';
import brandIconWhite from '@/assets/brand-icon-white.svg';
import brandWordmarkWhite from '@/assets/brand-wordmark-white.svg';

// Brand logo presets
type LogoVariant = 'black' | 'white';

interface BrandLogo {
  id: string;
  name: string;
  src: string;
  description: string;
  variant: LogoVariant;
  baseId: string; // Used to group variants together
}

const brandLogos: BrandLogo[] = [
  // Primary Logo variants
  {
    id: 'brand-primary-black',
    baseId: 'brand-primary',
    name: 'Primary Logo',
    src: brandLogoPrimary,
    description: 'Primary wordmark logo',
    variant: 'black',
  },
  {
    id: 'brand-primary-white',
    baseId: 'brand-primary',
    name: 'Primary Logo',
    src: brandLogoPrimaryWhite,
    description: 'Primary wordmark logo',
    variant: 'white',
  },
  // Secondary Logo variants
  {
    id: 'brand-secondary-black',
    baseId: 'brand-secondary',
    name: 'Secondary Logo',
    src: brandLogoSecondary,
    description: 'Secondary icon logo',
    variant: 'black',
  },
  {
    id: 'brand-secondary-white',
    baseId: 'brand-secondary',
    name: 'Secondary Logo',
    src: brandLogoSecondaryWhite,
    description: 'Secondary icon logo',
    variant: 'white',
  },
  // Icon variants
  {
    id: 'brand-icon-black',
    baseId: 'brand-icon',
    name: 'Brand Icon',
    src: brandIcon,
    description: 'Circular icon mark',
    variant: 'black',
  },
  {
    id: 'brand-icon-white',
    baseId: 'brand-icon',
    name: 'Brand Icon',
    src: brandIconWhite,
    description: 'Circular icon mark',
    variant: 'white',
  },
  // Wordmark variants
  {
    id: 'brand-wordmark-black',
    baseId: 'brand-wordmark',
    name: 'Brand Wordmark',
    src: brandWordmark,
    description: 'Brand wordmark',
    variant: 'black',
  },
  {
    id: 'brand-wordmark-white',
    baseId: 'brand-wordmark',
    name: 'Brand Wordmark',
    src: brandWordmarkWhite,
    description: 'Brand wordmark',
    variant: 'white',
  },
];

// Get unique logos (by baseId) for display
const uniqueLogos = brandLogos.filter((logo, index, self) =>
  index === self.findIndex((l) => l.baseId === logo.baseId)
);

// Helper to get logo by id (with fallback for legacy ids without variant)
const getLogoById = (id: string): BrandLogo | undefined => {
  // First try exact match
  let logo = brandLogos.find(l => l.id === id);
  if (logo) return logo;
  
  // Fallback for legacy ids (without -black/-white suffix)
  logo = brandLogos.find(l => l.baseId === id && l.variant === 'black');
  return logo;
};

// Block types for the email editor
type BlockType = 'text' | 'heading' | 'image' | 'button' | 'divider' | 'spacer' | 'link' | 'social' | 'footer' | 'header' | 'signature' | 'columns';

// Block types that can be placed inside columns (excludes header, footer, columns)
type ColumnBlockType = Exclude<BlockType, 'header' | 'footer' | 'columns'>;

// Column content item - simplified content for column cells (legacy support)
interface ColumnContent {
  id: string;
  type: 'text' | 'button' | 'image' | 'spacer';
  content: string;
  linkUrl?: string;
  imageUrl?: string;
  styles: {
    textAlign?: 'left' | 'center' | 'right';
    fontSize?: string;
    fontWeight?: string;
    textColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    buttonVariant?: 'primary' | 'secondary';
    buttonShape?: 'pill' | 'rounded' | 'rectangle';
    buttonSize?: number;
    height?: string;
  };
}

interface SocialLink {
  platform: 'instagram' | 'tiktok' | 'email';
  url: string;
  enabled: boolean;
}

interface NavLink {
  label: string;
  url: string;
  enabled: boolean;
  showArrow?: boolean;
}

interface EmailBlock {
  id: string;
  type: BlockType;
  content: string;
  styles: {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    padding?: string;
    paddingTop?: number; // 0-80px
    paddingBottom?: number; // 0-80px
    paddingHorizontal?: number; // 0-80px (left + right)
    borderRadius?: string;
    width?: string;
    height?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    buttonVariant?: 'primary' | 'secondary';
    buttonSize?: number; // 80-140 percentage scale
    // Border controls
    borderWidth?: number; // 0-8px
    borderColor?: string;
    borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
    // Opacity control
    backgroundOpacity?: number; // 0-100%
    // Divider specific
    dividerThickness?: number; // 1-8px
    dividerStyle?: 'solid' | 'dashed' | 'dotted' | 'double';
    dividerWidth?: number; // 20-100%
    buttonShape?: 'pill' | 'rounded' | 'rectangle';
    buttonArrow?: boolean; // Show right arrow in button
    linkSize?: number; // 80-140 percentage scale for link font size
    iconSize?: number; // 16-48 pixel size for social icons
  };
  imageUrl?: string;
  linkUrl?: string;
  socialLinks?: SocialLink[];
  footerConfig?: {
    showLogo: boolean;
    logoId: string;
    logoSize?: 'xs' | 'small' | 'medium' | 'large' | 'xl';
    logoPosition?: 'left' | 'center' | 'right';
    showSocialIcons: boolean;
    copyrightText: string;
  };
  headerConfig?: {
    showLogo: boolean;
    logoId: string;
    logoSize?: 'xs' | 'small' | 'medium' | 'large' | 'xl';
    logoPosition?: 'left' | 'center' | 'right';
    showNavLinks: boolean;
    navLinksPosition?: 'left' | 'center' | 'right';
  };
  navLinks?: NavLink[];
  signatureConfig?: {
    name: string;
    title: string;
    imageUrl: string;
    layout: 'horizontal-left' | 'horizontal-right' | 'stacked';
    imageSize?: number; // 40-120px
    indent?: number; // 0-60px left padding
    showPhone?: boolean;
    phone?: string;
    showEmail?: boolean;
    email?: string;
  };
  // Columns configuration - supports full blocks inside columns
  columnsConfig?: {
    columnCount: 2 | 3;
    columns: ColumnContent[][]; // Legacy support for simple content
    columnBlocks?: EmailBlock[][]; // Full blocks support (new)
    gap?: number; // 0-24px gap between columns
  };
}

interface EmailTemplateEditorProps {
  initialHtml: string;
  initialBlocks?: EmailBlock[] | null;
  variables: string[];
  onHtmlChange: (html: string) => void;
  onBlocksChange?: (blocks: EmailBlock[]) => void;
}

// Expose regenerateHtml via ref
export interface EmailTemplateEditorRef {
  regenerateHtml: () => void;
}

const colorPresets = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
];

const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px'];

// Email color themes
type ThemeCategory = 'all' | 'luxury' | 'dark' | 'light' | 'pastel' | 'warm';

const themeCategories: { id: ThemeCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'pastel', label: 'Pastel' },
  { id: 'warm', label: 'Warm' },
];

interface EmailTheme {
  id: string;
  name: string;
  description: string;
  category: ThemeCategory[];
  colors: {
    headerBg: string;
    headerText: string;
    bodyBg: string;
    bodyText: string;
    buttonBg: string;
    buttonText: string;
    accentColor: string;
    dividerColor: string;
    white: string;
  };
}

const emailThemes: EmailTheme[] = [
  {
    id: 'premium-dark',
    name: 'Premium Dark',
    description: 'Signature black, cream & oat luxury palette',
    category: ['luxury', 'dark', 'warm'],
    colors: {
      headerBg: '#000000',
      headerText: '#f5f0e8',
      bodyBg: '#f5f0e8',
      bodyText: '#1a1a1a',
      buttonBg: '#000000',
      buttonText: '#ffffff',
      accentColor: '#d4c5b0',
      dividerColor: '#d4c5b0',
      white: '#ffffff',
    },
  },
  {
    id: 'noir-gold',
    name: 'Noir & Gold',
    description: 'Luxurious black with gold accents',
    category: ['luxury', 'dark'],
    colors: {
      headerBg: '#0a0a0a',
      headerText: '#d4af37',
      bodyBg: '#1a1a1a',
      bodyText: '#f5f5f5',
      buttonBg: '#d4af37',
      buttonText: '#0a0a0a',
      accentColor: '#c9a227',
      dividerColor: '#3d3d3d',
      white: '#ffffff',
    },
  },
  {
    id: 'black-gold-elegance',
    name: 'Black Gold Elegance',
    description: 'Classic black with champagne gold',
    category: ['luxury', 'dark', 'light'],
    colors: {
      headerBg: '#000000',
      headerText: '#e8d5a3',
      bodyBg: '#faf8f5',
      bodyText: '#1a1a1a',
      buttonBg: '#1a1a1a',
      buttonText: '#e8d5a3',
      accentColor: '#e8d5a3',
      dividerColor: '#d4c5a3',
      white: '#ffffff',
    },
  },
  {
    id: 'blush-tan',
    name: 'Blush & Tan',
    description: 'Soft pink with warm tan accents',
    category: ['warm', 'light'],
    colors: {
      headerBg: '#d4a59a',
      headerText: '#ffffff',
      bodyBg: '#fdf6f3',
      bodyText: '#5c4033',
      buttonBg: '#c9967a',
      buttonText: '#ffffff',
      accentColor: '#e8c4b8',
      dividerColor: '#e8d5cf',
      white: '#ffffff',
    },
  },
  {
    id: 'rose-sand',
    name: 'Rose & Sand',
    description: 'Dusty rose with sandy neutrals',
    category: ['warm', 'light'],
    colors: {
      headerBg: '#b8838c',
      headerText: '#fff9f5',
      bodyBg: '#f5ebe0',
      bodyText: '#4a3728',
      buttonBg: '#a67c84',
      buttonText: '#ffffff',
      accentColor: '#d5b9a3',
      dividerColor: '#d4c4b0',
      white: '#ffffff',
    },
  },
  {
    id: 'pastel-dream',
    name: 'Pastel Dream',
    description: 'Soft lavender & mint pastels',
    category: ['pastel', 'light'],
    colors: {
      headerBg: '#c7b8ea',
      headerText: '#2d2a3e',
      bodyBg: '#f8f6fc',
      bodyText: '#3d3a4d',
      buttonBg: '#a8d8c8',
      buttonText: '#2d3a35',
      accentColor: '#f0e6ff',
      dividerColor: '#e0d6f0',
      white: '#ffffff',
    },
  },
  {
    id: 'pastel-peach',
    name: 'Pastel Peach',
    description: 'Soft peach & cream tones',
    category: ['pastel', 'light', 'warm'],
    colors: {
      headerBg: '#f5c6aa',
      headerText: '#3d2c24',
      bodyBg: '#fef9f6',
      bodyText: '#4a3830',
      buttonBg: '#e8a88c',
      buttonText: '#ffffff',
      accentColor: '#fce8dd',
      dividerColor: '#f0ddd2',
      white: '#ffffff',
    },
  },
  {
    id: 'pastel-sky',
    name: 'Pastel Sky',
    description: 'Soft blue & coral pastels',
    category: ['pastel', 'light'],
    colors: {
      headerBg: '#a8c8dc',
      headerText: '#2a3a45',
      bodyBg: '#f5f9fc',
      bodyText: '#3a4a55',
      buttonBg: '#f5a896',
      buttonText: '#ffffff',
      accentColor: '#d8e8f0',
      dividerColor: '#c8dce8',
      white: '#ffffff',
    },
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean black & white',
    category: ['dark', 'light'],
    colors: {
      headerBg: '#000000',
      headerText: '#ffffff',
      bodyBg: '#ffffff',
      bodyText: '#000000',
      buttonBg: '#000000',
      buttonText: '#ffffff',
      accentColor: '#f3f4f6',
      dividerColor: '#e5e7eb',
      white: '#ffffff',
    },
  },
  {
    id: 'warm-neutral',
    name: 'Warm Neutral',
    description: 'Soft beige & warm tones',
    category: ['warm', 'light'],
    colors: {
      headerBg: '#292524',
      headerText: '#faf7f5',
      bodyBg: '#faf7f5',
      bodyText: '#292524',
      buttonBg: '#78716c',
      buttonText: '#ffffff',
      accentColor: '#e7e5e4',
      dividerColor: '#d6d3d1',
      white: '#ffffff',
    },
  },
];

// Parse existing HTML into blocks (simplified parser)
function parseHtmlToBlocks(html: string): EmailBlock[] {
  // For complex HTML, we'll just create a single HTML block
  // In a real implementation, you'd parse the HTML properly
  if (!html || html.trim() === '') {
    return [
      {
        id: crypto.randomUUID(),
        type: 'heading',
        content: 'Email Title',
        styles: { textAlign: 'center', fontSize: '24px', textColor: '#ffffff', backgroundColor: '#3b82f6', padding: '24px' },
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        content: 'Add your email content here...',
        styles: { textAlign: 'left', fontSize: '16px', padding: '16px' },
      },
    ];
  }
  
  // Return empty to let user start fresh or import
  return [];
}

// Helper to compute padding string from individual values or fallback to legacy string
function computePadding(styles: EmailBlock['styles']): string {
  // If individual values exist, use them
  if (styles.paddingTop !== undefined || styles.paddingBottom !== undefined || styles.paddingHorizontal !== undefined) {
    const top = styles.paddingTop ?? 24;
    const bottom = styles.paddingBottom ?? 24;
    const horizontal = styles.paddingHorizontal ?? 24;
    return `${top}px ${horizontal}px ${bottom}px ${horizontal}px`;
  }
  // Fall back to legacy padding string
  return styles.padding || '24px';
}

// Helper to parse legacy padding string into individual values
function parsePaddingToValues(padding: string): { top: number; bottom: number; horizontal: number } {
  const values = padding.replace(/px/g, '').trim().split(/\s+/).map(Number);
  if (values.length === 1) {
    return { top: values[0], bottom: values[0], horizontal: values[0] };
  } else if (values.length === 2) {
    return { top: values[0], bottom: values[0], horizontal: values[1] };
  } else if (values.length === 3) {
    return { top: values[0], bottom: values[2], horizontal: values[1] };
  } else if (values.length >= 4) {
    return { top: values[0], bottom: values[2], horizontal: Math.round((values[1] + values[3]) / 2) };
  }
  return { top: 24, bottom: 24, horizontal: 24 };
}

// Generate HTML from blocks
function blocksToHtml(blocks: EmailBlock[]): string {
  const blockHtml = blocks.map(block => {
    // Compute padding from individual values or legacy string
    const padding = computePadding(block.styles);
    
    // Compute border styles
    const borderWidth = block.styles.borderWidth || 0;
    const borderStyle = block.styles.borderStyle || 'solid';
    const borderColor = block.styles.borderColor || '#e5e7eb';
    const borderStyles = borderWidth > 0 ? `border: ${borderWidth}px ${borderStyle} ${borderColor};` : '';
    
    // Compute background with opacity
    const bgOpacity = (block.styles.backgroundOpacity ?? 100) / 100;
    let bgStyle = '';
    if (block.styles.backgroundColor) {
      const bg = block.styles.backgroundColor;
      if (bgOpacity < 1 && bg.startsWith('#')) {
        // Convert hex to rgba
        const hex = bg.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        bgStyle = `background-color: rgba(${r}, ${g}, ${b}, ${bgOpacity});`;
      } else {
        bgStyle = `background-color: ${bg};`;
      }
    }
    
    // Base styles WITHOUT borderRadius - only apply borderRadius to elements that use it in canvas
    const baseStyles = `
      ${bgStyle}
      ${block.styles.textColor ? `color: ${block.styles.textColor};` : ''}
      ${block.styles.fontSize ? `font-size: ${block.styles.fontSize};` : ''}
      ${block.styles.fontWeight ? `font-weight: ${block.styles.fontWeight};` : ''}
      ${block.styles.textAlign ? `text-align: ${block.styles.textAlign};` : ''}
      padding: ${padding};
      ${borderStyles}
    `.trim();

    // Convert newlines to <br/> for proper email rendering
    const formatContent = (content: string) => content.replace(/\n/g, '<br/>');
    
    switch (block.type) {
      case 'heading':
        // Heading does NOT use borderRadius in canvas, so don't apply it here
        return `<h1 style="${baseStyles}; margin: 0; font-size: ${block.styles.fontSize || '24px'}; line-height: 1.3;">${formatContent(block.content)}</h1>`;
      case 'text':
        return `<p style="${baseStyles}; margin: 0; font-size: ${block.styles.fontSize || '16px'}; line-height: 1.6;">${formatContent(block.content)}</p>`;
      case 'image': {
        const imgUrl = block.imageUrl || 'https://via.placeholder.com/400x200';
        const absoluteImgUrl = imgUrl.startsWith('/') ? `${window.location.origin}${imgUrl}` : imgUrl;
        return `<div style="text-align: ${block.styles.textAlign || 'center'}; padding: ${computePadding(block.styles)};">
          <img src="${absoluteImgUrl}" alt="${block.content || 'Email image'}" style="max-width: 100%; ${block.styles.width ? `width: ${block.styles.width};` : ''} ${block.styles.borderRadius ? `border-radius: ${block.styles.borderRadius};` : ''}" />
        </div>`;
      }
      case 'button': {
        const isSecondary = block.styles.buttonVariant === 'secondary';
        const sizeScale = (block.styles.buttonSize || 100) / 100;
        const basePaddingV = Math.round(16 * sizeScale);
        const basePaddingH = Math.round(32 * sizeScale);
        const baseFontSize = Math.round(16 * sizeScale);
        const shapeRadius = block.styles.buttonShape === 'pill' ? '9999px' : block.styles.buttonShape === 'rectangle' ? '0px' : '8px';
        const showArrow = block.styles.buttonArrow === true;
        const arrowSvg = showArrow 
          ? `<span style="display: inline-block; margin-left: 8px; vertical-align: middle;">
              <svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(16 * sizeScale)}" height="${Math.round(16 * sizeScale)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>`
          : '';
        const buttonStyles = isSecondary
          ? `display: inline-block; background-color: ${block.styles.backgroundColor || '#f5f0e8'}; color: ${block.styles.buttonColor || '#1a1a1a'}; padding: ${basePaddingV}px ${basePaddingH}px; text-decoration: none; font-weight: bold; font-size: ${baseFontSize}px; border: 2px solid ${block.styles.buttonColor || '#1a1a1a'}; border-radius: ${shapeRadius};`
          : `display: inline-block; background-color: ${block.styles.buttonColor || '#3b82f6'}; color: ${block.styles.buttonTextColor || '#ffffff'}; padding: ${basePaddingV}px ${basePaddingH}px; text-decoration: none; font-weight: bold; font-size: ${baseFontSize}px; border-radius: ${shapeRadius};`;
        // Include background-color on wrapper div to match body background
        return `<div style="text-align: ${block.styles.textAlign || 'center'}; padding: ${computePadding(block.styles)}; ${block.styles.backgroundColor ? `background-color: ${block.styles.backgroundColor};` : ''} font-size: 16px; line-height: 1.4;">
          <a href="${block.linkUrl || '{{dashboard_url}}'}" style="${buttonStyles}">${block.content}${arrowSvg}</a>
        </div>`;
      }
      case 'link': {
        const linkFontSize = Math.round(16 * ((block.styles.linkSize || 100) / 100));
        return `<p style="${baseStyles}; margin: 0; line-height: 1.6; font-size: ${linkFontSize}px;">
          <a href="${block.linkUrl || '#'}" style="color: ${block.styles.buttonColor || '#3b82f6'}; text-decoration: underline; font-size: ${linkFontSize}px;">${block.content}</a>
        </p>`;
      }
      case 'divider': {
        const thickness = block.styles.dividerThickness || 1;
        const style = block.styles.dividerStyle || 'solid';
        const width = block.styles.dividerWidth || 100;
        const color = block.styles.textColor || '#e5e7eb';
        return `<div style="text-align: center; padding: ${block.styles.padding || '16px 0'};">
          <hr style="border: none; border-top: ${thickness}px ${style} ${color}; margin: 0 auto; width: ${width}%;" />
        </div>`;
      }
      case 'spacer': {
        const height = parseInt(block.styles.height || '24') || 24;
        return `<div style="height: ${height}px;"></div>`;
      }
      case 'social': {
        const enabledLinks = (block.socialLinks || []).filter(link => link.enabled);
        if (enabledLinks.length === 0) return '';
        
        const iconSize = block.styles.iconSize || 24;
        const iconStyle = `display: inline-block; width: ${iconSize}px; height: ${iconSize}px; margin: 0 8px; text-decoration: none;`;
        const socialIcons = enabledLinks.map(link => {
          const iconColor = block.styles.buttonColor || '#1a1a1a';
          let svg = '';
          let href = link.url;
          
          switch (link.platform) {
            case 'instagram':
              svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`;
              break;
            case 'tiktok':
              svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>`;
              break;
            case 'email':
              svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
              if (!href.startsWith('mailto:')) href = `mailto:${href}`;
              break;
          }
          
          return `<a href="${href}" style="${iconStyle}" target="_blank" rel="noopener">${svg}</a>`;
        }).join('');
        
        return `<div style="text-align: ${block.styles.textAlign || 'center'}; padding: ${computePadding(block.styles)}; ${block.styles.backgroundColor ? `background-color: ${block.styles.backgroundColor};` : ''} font-size: 14px; line-height: 1;">
          ${socialIcons}
        </div>`;
      }
      case 'footer': {
        const defaultFooterConfig = { showLogo: true, logoId: 'brand-primary-white', showSocialIcons: true, copyrightText: '© 2026 All rights reserved.', logoSize: 'large' as const, logoPosition: 'center' as const };
        const footerConfig = block.footerConfig ? { ...defaultFooterConfig, ...block.footerConfig } : defaultFooterConfig;
        const logoId = (footerConfig.logoId && footerConfig.logoId.length > 0) ? footerConfig.logoId : 'brand-primary-white';
        const logo = getLogoById(logoId) || brandLogos.find(l => l.variant === 'white') || brandLogos[0];
        const bgColor = block.styles.backgroundColor || '#1a1a1a';
        const textColor = block.styles.textColor || '#f5f0e8';
        const iconColor = block.styles.buttonColor || '#f5f0e8';
        const logoSizeMap = { xs: '50px', small: '80px', medium: '120px', large: '160px', xl: '220px' };
        const logoMaxWidth = logoSizeMap[footerConfig.logoSize || 'large'];
        const logoPosition = footerConfig.logoPosition || 'center';
        const showLogo = footerConfig.showLogo !== false;
        
        // Map logoPosition to text-align for HTML
        const textAlign = logoPosition === 'left' ? 'left' : logoPosition === 'right' ? 'right' : 'center';
        
        // Convert logo src to absolute URL for preview compatibility
        const absoluteLogoSrc = logo.src.startsWith('/') ? `${window.location.origin}${logo.src}` : logo.src;
        
        let logoHtml = '';
        if (showLogo && logo) {
          // Use display:block and margin:auto for centering, text-align for left/right alignment
          const imgMargin = textAlign === 'center' ? 'margin: 0 auto;' : textAlign === 'right' ? 'margin-left: auto;' : '';
          logoHtml = `<div style="margin-bottom: 12px; text-align: ${textAlign};">
            <img src="${absoluteLogoSrc}" alt="${logo.name}" style="max-width: ${logoMaxWidth}; height: auto; display: block; ${imgMargin}" />
          </div>`;
        }
        
        let socialHtml = '';
        if (footerConfig.showSocialIcons) {
          const enabledLinks = (block.socialLinks || []).filter(link => link.enabled);
          if (enabledLinks.length > 0) {
            const iconStyle = `display: inline-block; width: 24px; height: 24px; margin: 0 8px; text-decoration: none;`;
            socialHtml = `<div style="margin-bottom: 12px; text-align: ${textAlign}; font-size: 14px; line-height: 1;">` + enabledLinks.map(link => {
              let svg = '';
              let href = link.url;
              
              switch (link.platform) {
                case 'instagram':
                  svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`;
                  break;
                case 'tiktok':
                  svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>`;
                  break;
                case 'email':
                  svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
                  if (!href.startsWith('mailto:')) href = `mailto:${href}`;
                  break;
              }
              
              return `<a href="${href}" style="${iconStyle}" target="_blank" rel="noopener">${svg}</a>`;
            }).join('') + `</div>`;
          }
        }
        
        return `<div style="text-align: ${textAlign}; background-color: ${bgColor}; color: ${textColor}; padding: ${computePadding(block.styles)}; border-radius: ${block.styles.borderRadius || '0 0 12px 12px'}; font-size: 14px; line-height: 1.4;">
          ${logoHtml}
          ${socialHtml}
          <p style="margin: 0; font-size: 11px; opacity: 0.8; text-align: ${textAlign};">${footerConfig.copyrightText}</p>
        </div>`;
      }
      case 'header': {
        const headerConfig = block.headerConfig || { showLogo: true, logoId: 'brand-primary-black', showNavLinks: true, logoPosition: 'left', navLinksPosition: 'right', logoSize: 'medium' };
        const logo = getLogoById(headerConfig.logoId) || brandLogos[0];
        const bgColor = block.styles.backgroundColor || '#1a1a1a';
        const textColor = block.styles.textColor || '#f5f0e8';
        const logoSizeMap = { xs: '50px', small: '80px', medium: '120px', large: '160px', xl: '220px' };
        const logoMaxWidth = logoSizeMap[headerConfig.logoSize || 'medium'];
        const logoPosition = headerConfig.logoPosition || 'left';
        const navLinksPosition = headerConfig.navLinksPosition || 'right';
        const padding = computePadding(block.styles);
        
        // Convert logo src to absolute URL for preview compatibility
        const absoluteLogoSrc = logo.src.startsWith('/') ? `${window.location.origin}${logo.src}` : logo.src;
        
        let logoHtml = '';
        if (headerConfig.showLogo) {
          logoHtml = `<img src="${absoluteLogoSrc}" alt="${logo.name}" style="max-width: ${logoMaxWidth}; height: auto; display: block;" />`;
        }
        
        let navHtml = '';
        if (headerConfig.showNavLinks) {
          const enabledLinks = (block.navLinks || []).filter(link => link.enabled);
          if (enabledLinks.length > 0) {
            navHtml = `<div style="display: inline-flex; align-items: center; gap: 16px;">` +
              enabledLinks.map(link => {
                const arrowSvg = link.showArrow ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px; vertical-align: middle;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>` : '';
                return `<a href="${link.url}" style="color: ${textColor}; text-decoration: none; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center;">${link.label}${arrowSvg}</a>`;
              }).join('') + `</div>`;
          }
        }
        
        // Build 3-column table for email client compatibility (matches canvas grid layout)
        // Use border-spacing:0 and cellspacing=0 to ensure no gaps
        const leftContent = (logoPosition === 'left' ? logoHtml : '') + (navLinksPosition === 'left' ? navHtml : '');
        const centerContent = (logoPosition === 'center' ? logoHtml : '') + (navLinksPosition === 'center' ? navHtml : '');
        const rightContent = (logoPosition === 'right' ? logoHtml : '') + (navLinksPosition === 'right' ? navHtml : '');
        
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgColor}; border-radius: ${block.styles.borderRadius || '12px 12px 0 0'}; border-collapse: collapse; border-spacing: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          <tr>
            <td width="33%" style="text-align: left; vertical-align: middle; padding: ${padding}; color: ${textColor}; border: 0; border-spacing: 0;">${leftContent}</td>
            <td width="34%" style="text-align: center; vertical-align: middle; padding: ${padding}; color: ${textColor}; border: 0; border-spacing: 0;">${centerContent}</td>
            <td width="33%" style="text-align: right; vertical-align: middle; padding: ${padding}; color: ${textColor}; border: 0; border-spacing: 0;">${rightContent}</td>
          </tr>
        </table>`;
      }
      case 'signature': {
        const config = block.signatureConfig || { name: 'Your Name', title: 'Your Title', imageUrl: '', layout: 'horizontal-left', imageSize: 80, indent: 0 };
        const bgColor = block.styles.backgroundColor || '#f5f0e8';
        const textColor = block.styles.textColor || '#1a1a1a';
        const textAlign = block.styles.textAlign || 'left';
        const padding = computePadding(block.styles);
        // Extract horizontal padding for indent calculation
        const horizontalPadding = block.styles.paddingHorizontal ?? 24;
        const imageSize = config.imageSize || 80;
        const indent = config.indent || 0;
        
        // Convert image URL to absolute if needed
        const absoluteImgUrl = config.imageUrl 
          ? (config.imageUrl.startsWith('/') ? `${window.location.origin}${config.imageUrl}` : config.imageUrl)
          : '';
        
        const imageHtml = absoluteImgUrl 
          ? `<img src="${absoluteImgUrl}" alt="Signature" style="width: ${imageSize}px; height: ${imageSize}px; border-radius: 50%; object-fit: cover; display: block;" />`
          : '';
        
        // Build contact info lines
        const contactLines: string[] = [];
        if (config.showPhone && config.phone) {
          contactLines.push(`<div style="font-size: 12px; opacity: 0.7; line-height: 1.4;">📞 ${config.phone}</div>`);
        }
        if (config.showEmail && config.email) {
          contactLines.push(`<div style="font-size: 12px; opacity: 0.7; line-height: 1.4;">✉️ ${config.email}</div>`);
        }
        
        const textHtml = `<div style="display: inline-block; vertical-align: middle;">
          <div style="font-weight: bold; font-size: 16px; line-height: 1.3;">${config.name}</div>
          <div style="font-size: 14px; opacity: 0.8; line-height: 1.3;">${config.title}</div>
          ${contactLines.length > 0 ? `<div style="margin-top: 4px;">${contactLines.join('')}</div>` : ''}
        </div>`;
        
        let contentHtml = '';
        if (config.layout === 'stacked') {
          contentHtml = imageHtml 
            ? `<div style="text-align: ${textAlign}; margin-bottom: 12px;">${imageHtml.replace('display: block;', `display: inline-block;`)}</div>${textHtml}`
            : textHtml;
        } else if (config.layout === 'horizontal-right') {
          contentHtml = `<table cellpadding="0" cellspacing="0" border="0" style="display: inline-table;">
            <tr>
              <td style="vertical-align: middle; padding-right: ${imageHtml ? '16px' : '0'};">${textHtml}</td>
              ${imageHtml ? `<td style="vertical-align: middle;">${imageHtml}</td>` : ''}
            </tr>
          </table>`;
        } else {
          // horizontal-left (default)
          contentHtml = `<table cellpadding="0" cellspacing="0" border="0" style="display: inline-table;">
            <tr>
              ${imageHtml ? `<td style="vertical-align: middle; padding-right: 16px;">${imageHtml}</td>` : ''}
              <td style="vertical-align: middle;">${textHtml}</td>
            </tr>
          </table>`;
        }
        
        return `<div style="text-align: ${textAlign}; background-color: ${bgColor}; color: ${textColor}; padding: ${padding}; ${indent > 0 ? `padding-left: ${horizontalPadding + indent}px;` : ''}">
          ${contentHtml}
        </div>`;
      }
      case 'columns': {
        const config = block.columnsConfig || { columnCount: 2, columns: [[], []], columnBlocks: [[], []], gap: 16 };
        const columnCount = config.columnCount;
        const gap = config.gap || 16;
        const columnWidth = columnCount === 2 ? '50%' : '33.33%';
        const bgColor = block.styles.backgroundColor || '#f5f0e8';
        const textColor = block.styles.textColor || '#1a1a1a';
        const padding = computePadding(block.styles);
        
        // Use columnBlocks if available (new format), otherwise fall back to columns (legacy)
        const useBlocks = config.columnBlocks && config.columnBlocks.some(col => col.length > 0);
        
        // Helper to generate HTML for a single block inside a column
        const generateColumnBlockHtml = (columnBlock: EmailBlock): string => {
          const blockPadding = computePadding(columnBlock.styles);
          const formatContent = (content: string) => content.replace(/\n/g, '<br/>');
          
          switch (columnBlock.type) {
            case 'heading':
              return `<h2 style="margin: 0; font-size: ${columnBlock.styles.fontSize || '20px'}; color: ${columnBlock.styles.textColor || textColor}; text-align: ${columnBlock.styles.textAlign || 'center'}; line-height: 1.3; padding: ${blockPadding}; ${columnBlock.styles.backgroundColor ? `background-color: ${columnBlock.styles.backgroundColor};` : ''}">${formatContent(columnBlock.content)}</h2>`;
            case 'text':
              return `<p style="margin: 0; font-size: ${columnBlock.styles.fontSize || '14px'}; color: ${columnBlock.styles.textColor || textColor}; text-align: ${columnBlock.styles.textAlign || 'center'}; line-height: 1.5; padding: ${blockPadding}; ${columnBlock.styles.backgroundColor ? `background-color: ${columnBlock.styles.backgroundColor};` : ''}">${formatContent(columnBlock.content)}</p>`;
            case 'button': {
              const isSecondary = columnBlock.styles.buttonVariant === 'secondary';
              const sizeScale = (columnBlock.styles.buttonSize || 100) / 100;
              const basePaddingV = Math.round(12 * sizeScale);
              const basePaddingH = Math.round(24 * sizeScale);
              const baseFontSize = Math.round(14 * sizeScale);
              const shapeRadius = columnBlock.styles.buttonShape === 'pill' ? '9999px' : columnBlock.styles.buttonShape === 'rectangle' ? '0px' : '6px';
              const buttonStyles = isSecondary
                ? `display: inline-block; background-color: transparent; color: ${columnBlock.styles.buttonColor || '#1a1a1a'}; padding: ${basePaddingV}px ${basePaddingH}px; text-decoration: none; font-weight: bold; font-size: ${baseFontSize}px; border: 2px solid ${columnBlock.styles.buttonColor || '#1a1a1a'}; border-radius: ${shapeRadius};`
                : `display: inline-block; background-color: ${columnBlock.styles.buttonColor || '#000000'}; color: ${columnBlock.styles.buttonTextColor || '#ffffff'}; padding: ${basePaddingV}px ${basePaddingH}px; text-decoration: none; font-weight: bold; font-size: ${baseFontSize}px; border-radius: ${shapeRadius};`;
              return `<div style="text-align: ${columnBlock.styles.textAlign || 'center'}; padding: ${blockPadding};">
                <a href="${columnBlock.linkUrl || '#'}" style="${buttonStyles}">${columnBlock.content}</a>
              </div>`;
            }
            case 'image': {
              const imgUrl = columnBlock.imageUrl || '';
              if (!imgUrl) return '';
              const absoluteImgUrl = imgUrl.startsWith('/') ? `${window.location.origin}${imgUrl}` : imgUrl;
              return `<div style="text-align: ${columnBlock.styles.textAlign || 'center'}; padding: ${blockPadding};">
                <img src="${absoluteImgUrl}" alt="${columnBlock.content || 'Image'}" style="max-width: 100%; height: auto; ${columnBlock.styles.borderRadius ? `border-radius: ${columnBlock.styles.borderRadius};` : ''}" />
              </div>`;
            }
            case 'link': {
              const linkFontSize = Math.round(16 * ((columnBlock.styles.linkSize || 100) / 100));
              return `<p style="margin: 0; padding: ${blockPadding}; text-align: ${columnBlock.styles.textAlign || 'center'}; line-height: 1.6;">
                <a href="${columnBlock.linkUrl || '#'}" style="color: ${columnBlock.styles.buttonColor || '#3b82f6'}; text-decoration: underline; font-size: ${linkFontSize}px;">${columnBlock.content}</a>
              </p>`;
            }
            case 'divider': {
              const thickness = columnBlock.styles.dividerThickness || 1;
              const divStyle = columnBlock.styles.dividerStyle || 'solid';
              const divWidth = columnBlock.styles.dividerWidth || 100;
              const divColor = columnBlock.styles.textColor || '#e5e7eb';
              return `<div style="text-align: center; padding: ${columnBlock.styles.padding || '8px 0'};">
                <hr style="border: none; border-top: ${thickness}px ${divStyle} ${divColor}; margin: 0 auto; width: ${divWidth}%;" />
              </div>`;
            }
            case 'spacer': {
              const height = parseInt(columnBlock.styles.height || '24') || 24;
              return `<div style="height: ${height}px;"></div>`;
            }
            case 'social': {
              const enabledLinks = (columnBlock.socialLinks || []).filter(link => link.enabled);
              if (enabledLinks.length === 0) return '';
              const iconSize = columnBlock.styles.iconSize || 24;
              const iconStyle = `display: inline-block; width: ${iconSize}px; height: ${iconSize}px; margin: 0 8px; text-decoration: none;`;
              const socialIcons = enabledLinks.map(link => {
                const iconColor = columnBlock.styles.buttonColor || '#1a1a1a';
                let svg = '';
                let href = link.url;
                switch (link.platform) {
                  case 'instagram':
                    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`;
                    break;
                  case 'tiktok':
                    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>`;
                    break;
                  case 'email':
                    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
                    if (!href.startsWith('mailto:')) href = `mailto:${href}`;
                    break;
                }
                return `<a href="${href}" style="${iconStyle}" target="_blank" rel="noopener">${svg}</a>`;
              }).join('');
              return `<div style="text-align: ${columnBlock.styles.textAlign || 'center'}; padding: ${blockPadding}; font-size: 14px; line-height: 1;">
                ${socialIcons}
              </div>`;
            }
            default:
              return '';
          }
        };
        
        // Generate content for each column
        const columnCells = (useBlocks ? config.columnBlocks! : []).map((columnBlocks, colIndex) => {
          const cellContent = columnBlocks.map(generateColumnBlockHtml).join('');
          
          return `<td width="${columnWidth}" style="vertical-align: top; padding: ${colIndex < columnCount - 1 ? `0 ${gap / 2}px 0 0` : `0 0 0 ${gap / 2}px`}; text-align: center;">
            ${cellContent || '<p style="margin: 0; color: #999; font-size: 12px; font-style: italic;">Add content</p>'}
          </td>`;
        }).join('');
        
        // Legacy support: if no columnBlocks, use legacy columns format
        const legacyColumnCells = (!useBlocks ? config.columns : []).map((columnItems, colIndex) => {
          const cellContent = columnItems.map(item => {
            if (item.type === 'text') {
              return `<p style="margin: 0; font-size: ${item.styles.fontSize || '14px'}; color: ${item.styles.textColor || textColor}; text-align: ${item.styles.textAlign || 'center'}; line-height: 1.5;">${item.content}</p>`;
            } else if (item.type === 'button') {
              const isSecondary = item.styles.buttonVariant === 'secondary';
              const sizeScale = (item.styles.buttonSize || 100) / 100;
              const basePaddingV = Math.round(12 * sizeScale);
              const basePaddingH = Math.round(24 * sizeScale);
              const baseFontSize = Math.round(14 * sizeScale);
              const shapeRadius = item.styles.buttonShape === 'pill' ? '9999px' : item.styles.buttonShape === 'rectangle' ? '0px' : '6px';
              const buttonStyles = isSecondary
                ? `display: inline-block; background-color: transparent; color: ${item.styles.buttonColor || '#1a1a1a'}; padding: ${basePaddingV}px ${basePaddingH}px; text-decoration: none; font-weight: bold; font-size: ${baseFontSize}px; border: 2px solid ${item.styles.buttonColor || '#1a1a1a'}; border-radius: ${shapeRadius};`
                : `display: inline-block; background-color: ${item.styles.buttonColor || '#000000'}; color: ${item.styles.buttonTextColor || '#ffffff'}; padding: ${basePaddingV}px ${basePaddingH}px; text-decoration: none; font-weight: bold; font-size: ${baseFontSize}px; border-radius: ${shapeRadius};`;
              return `<div style="text-align: ${item.styles.textAlign || 'center'}; padding: 8px 0;">
                <a href="${item.linkUrl || '#'}" style="${buttonStyles}">${item.content}</a>
              </div>`;
            } else if (item.type === 'image') {
              const imgUrl = item.imageUrl || '';
              if (!imgUrl) return '';
              const absoluteImgUrl = imgUrl.startsWith('/') ? `${window.location.origin}${imgUrl}` : imgUrl;
              return `<div style="text-align: ${item.styles.textAlign || 'center'}; padding: 8px 0;">
                <img src="${absoluteImgUrl}" alt="${item.content || 'Image'}" style="max-width: 100%; height: auto;" />
              </div>`;
            } else if (item.type === 'spacer') {
              return `<div style="height: ${item.styles.height || '16px'};"></div>`;
            }
            return '';
          }).join('');
          
          return `<td width="${columnWidth}" style="vertical-align: top; padding: ${colIndex < columnCount - 1 ? `0 ${gap / 2}px 0 0` : `0 0 0 ${gap / 2}px`}; text-align: center;">
            ${cellContent || '<p style="margin: 0; color: #999; font-size: 12px; font-style: italic;">Add content</p>'}
          </td>`;
        }).join('');
        
        return `<div style="background-color: ${bgColor}; padding: ${padding};">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
            <tr>${useBlocks ? columnCells : legacyColumnCells}</tr>
          </table>
        </div>`;
      }
      default:
        return '';
    }
  }).join('');

  // Use mso-line-height-rule to ensure consistent rendering across email clients
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; mso-line-height-rule: exactly;">
${blockHtml}
</div>`;
}

export const EmailTemplateEditor = forwardRef<EmailTemplateEditorRef, EmailTemplateEditorProps>(
  function EmailTemplateEditor({ initialHtml, initialBlocks, variables, onHtmlChange, onBlocksChange }, ref) {
  const defaultTheme = emailThemes[0]; // Premium Dark
  
  const getInitialBlocks = (): EmailBlock[] => {
    // If we have saved blocks, use them directly
    if (initialBlocks && Array.isArray(initialBlocks) && initialBlocks.length > 0) {
      return initialBlocks;
    }
    
    // Otherwise fall back to default blocks with header pre-added
    return [
      {
        id: crypto.randomUUID(),
        type: 'header',
        content: '',
        styles: { 
          textAlign: 'center', 
          fontSize: '16px', 
          padding: '20px 24px', 
          backgroundColor: defaultTheme.colors.headerBg,
          textColor: defaultTheme.colors.headerText,
          borderRadius: '12px 12px 0 0'
        },
        navLinks: [
          { label: 'Dashboard Login', url: '/login', enabled: true },
        ],
        headerConfig: {
          showLogo: true,
           logoId: 'brand-secondary-white',
          logoSize: 'small' as const,
          logoPosition: 'left' as const,
          showNavLinks: true,
          navLinksPosition: 'right' as const,
        }
      },
      {
        id: crypto.randomUUID(),
        type: 'heading',
        content: '📧 Email Title',
        styles: { 
          textAlign: 'center', 
          fontSize: '24px', 
          textColor: defaultTheme.colors.headerText, 
          backgroundColor: defaultTheme.colors.headerBg, 
          padding: '24px', 
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        content: 'Hi {{employee_name}},\n\nAdd your email content here...',
        styles: { 
          textAlign: 'left', 
          fontSize: '16px', 
          padding: '24px', 
          backgroundColor: defaultTheme.colors.bodyBg,
          textColor: defaultTheme.colors.bodyText
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'button',
        content: 'Take Action',
        styles: { 
          textAlign: 'center', 
          padding: '24px', 
          buttonColor: defaultTheme.colors.buttonBg, 
          buttonTextColor: defaultTheme.colors.buttonText, 
          borderRadius: '8px',
          backgroundColor: defaultTheme.colors.bodyBg
        },
        linkUrl: '{{dashboard_url}}',
      },
      {
        id: crypto.randomUUID(),
        type: 'footer',
        content: '',
        styles: { 
          textAlign: 'center', 
          fontSize: '12px', 
          padding: '32px 24px', 
          backgroundColor: defaultTheme.colors.headerBg,
          textColor: defaultTheme.colors.headerText,
          buttonColor: defaultTheme.colors.headerText,
          borderRadius: '0 0 12px 12px'
        },
        socialLinks: [
          { platform: 'instagram' as const, url: '', enabled: false },
          { platform: 'tiktok' as const, url: '', enabled: false },
          { platform: 'email' as const, url: '', enabled: false },
        ],
        footerConfig: {
          showLogo: true,
          logoId: 'brand-primary-white',
          logoSize: 'large' as const,
          logoPosition: 'center' as const,
          showSocialIcons: true,
          copyrightText: '© 2026 All rights reserved.',
        }
      },
    ];
  };

  const { 
    state: blocks, 
    setState: setBlocks, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useUndoRedo<EmailBlock[]>(getInitialBlocks());
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'code' | 'preview'>('visual');
  const [toolbarPanel, setToolbarPanel] = useState<'themes' | 'blocks' | 'logos' | 'variables' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [rawHtml, setRawHtml] = useState(initialHtml);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);
  const [recentlyMovedBlockId, setRecentlyMovedBlockId] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  // Column item drag and drop state (legacy - for ColumnContent)
  const [draggedColumnItem, setDraggedColumnItem] = useState<{
    blockId: string;
    colIndex: number;
    itemIndex: number;
    item: ColumnContent;
  } | null>(null);
  const [dropTargetColumn, setDropTargetColumn] = useState<{
    blockId: string;
    colIndex: number;
    itemIndex: number | null; // null means drop at end
  } | null>(null);
  
  // Column block drag and drop state (for full EmailBlock in columns)
  const [draggedColumnBlock, setDraggedColumnBlock] = useState<{
    parentBlockId: string;
    colIndex: number;
    blockIndex: number;
    block: EmailBlock;
  } | null>(null);
  const [dropTargetColumnBlock, setDropTargetColumnBlock] = useState<{
    parentBlockId: string;
    colIndex: number;
    blockIndex: number | null; // null means drop at end
  } | null>(null);
  
  // Cross-drag state: main block dragged into column
  const [mainBlockDragTarget, setMainBlockDragTarget] = useState<{
    parentBlockId: string;
    colIndex: number;
    blockIndex: number | null;
  } | null>(null);
  
  // Cross-drag state: column block dragged to main list
  const [columnBlockToMainTarget, setColumnBlockToMainTarget] = useState<{
    targetBlockId: string;
    position: 'above' | 'below';
  } | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>('premium-dark');
  const [customThemes, setCustomThemes] = useState<EmailTheme[]>([]);
  const [isCreateThemeOpen, setIsCreateThemeOpen] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [emailVariables, setEmailVariables] = useState<Array<{ variable_key: string; category: string; description: string; example: string | null }>>([]);
  const [variableSearchTerm, setVariableSearchTerm] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageFile, setCropImageFile] = useState<File | null>(null);
  const [cropTargetBlockId, setCropTargetBlockId] = useState<string | null>(null);
  const [hintsVisible, setHintsVisible] = useState({ edit: true, preview: true });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  
  const [newTheme, setNewTheme] = useState<Omit<EmailTheme, 'id'>>({
    name: '',
    description: '',
    category: [],
    colors: {
      headerBg: '#1a1a1a',
      headerText: '#f5f0e8',
      bodyBg: '#f5f0e8',
      bodyText: '#1a1a1a',
      buttonBg: '#1a1a1a',
      buttonText: '#ffffff',
      accentColor: '#d4c5b0',
      dividerColor: '#d4c5b0',
      white: '#ffffff',
    },
  });
  const [themeCategoryFilter, setThemeCategoryFilter] = useState<ThemeCategory>('all');

  const { user } = useAuth();
  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  // Fetch custom themes on mount
  useEffect(() => {
    const fetchCustomThemes = async () => {
      const { data, error } = await supabase
        .from('email_themes')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching custom themes:', error);
        return;
      }

      const themes: EmailTheme[] = (data || []).map(t => ({
        id: `custom-${t.id}`,
        name: t.name,
        description: t.description || 'Custom theme',
        category: [] as ThemeCategory[],
        colors: {
          headerBg: t.header_bg,
          headerText: t.header_text,
          bodyBg: t.body_bg,
          bodyText: t.body_text,
          buttonBg: t.button_bg,
          buttonText: '#ffffff',
          accentColor: t.accent_color,
          dividerColor: t.divider_color,
          white: '#ffffff',
        },
      }));
      setCustomThemes(themes);
    };

    const fetchEmailVariables = async () => {
      const { data, error } = await supabase
        .from('email_variables')
        .select('variable_key, category, description, example')
        .eq('is_active', true)
        .order('category')
        .order('variable_key');
      
      if (error) {
        console.error('Error fetching email variables:', error);
        return;
      }

      setEmailVariables(data || []);
    };

    fetchCustomThemes();
    fetchEmailVariables();
  }, []);

  const handleSaveCustomTheme = async () => {
    if (!newTheme.name.trim()) {
      toast.error('Please enter a theme name');
      return;
    }
    // Validate all 5 colors are defined
    const requiredColors = ['headerBg', 'bodyBg', 'buttonBg', 'accentColor', 'dividerColor'] as const;
    const missingColors = requiredColors.filter(key => !newTheme.colors[key] || newTheme.colors[key] === '');
    if (missingColors.length > 0) {
      toast.error('All 5 theme colors are required');
      return;
    }
    if (!user?.id) {
      toast.error('You must be logged in to save themes');
      return;
    }

    setIsSavingTheme(true);
    try {
      const { data, error } = await supabase
        .from('email_themes')
        .insert({
          name: newTheme.name,
          description: newTheme.description,
          header_bg: newTheme.colors.headerBg,
          header_text: newTheme.colors.headerText,
          body_bg: newTheme.colors.bodyBg,
          body_text: newTheme.colors.bodyText,
          button_bg: newTheme.colors.buttonBg,
          button_text: newTheme.colors.buttonText,
          accent_color: newTheme.colors.accentColor,
          divider_color: newTheme.colors.dividerColor,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newCustomTheme: EmailTheme = {
        id: `custom-${data.id}`,
        name: data.name,
        description: data.description || 'Custom theme',
        category: [],
        colors: {
          headerBg: data.header_bg,
          headerText: data.header_text,
          bodyBg: data.body_bg,
          bodyText: data.body_text,
          buttonBg: data.button_bg,
          buttonText: '#ffffff',
          accentColor: data.accent_color,
          dividerColor: data.divider_color,
          white: '#ffffff',
        },
      };

      setCustomThemes(prev => [...prev, newCustomTheme]);
      setIsCreateThemeOpen(false);
      setNewTheme({
        name: '',
        description: '',
        category: [],
        colors: {
          headerBg: '#1a1a1a',
          headerText: '#f5f0e8',
          bodyBg: '#f5f0e8',
          bodyText: '#1a1a1a',
          buttonBg: '#1a1a1a',
          buttonText: '#ffffff',
          accentColor: '#d4c5b0',
          dividerColor: '#d4c5b0',
          white: '#ffffff',
        },
      });
      toast.success('Custom theme saved!');
    } catch (error: any) {
      console.error('Error saving theme:', error);
      toast.error('Failed to save theme');
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleDeleteCustomTheme = async (themeId: string) => {
    const dbId = themeId.replace('custom-', '');
    
    try {
      const { error } = await supabase
        .from('email_themes')
        .delete()
        .eq('id', dbId);

      if (error) throw error;

      setCustomThemes(prev => prev.filter(t => t.id !== themeId));
      if (selectedTheme === themeId) {
        setSelectedTheme('premium-dark');
      }
      toast.success('Theme deleted');
    } catch (error: any) {
      console.error('Error deleting theme:', error);
      toast.error('Failed to delete theme');
    }
  };

  const handleEditTheme = (theme: EmailTheme) => {
    setEditingThemeId(theme.id);
    setNewTheme({
      name: theme.name,
      description: theme.description,
      category: theme.category,
      colors: { ...theme.colors },
    });
    setIsCreateThemeOpen(true);
  };

  const handleEditCustomTheme = (themeId: string) => {
    const theme = customThemes.find(t => t.id === themeId);
    if (theme) {
      handleEditTheme(theme);
    }
  };

  const handleUpdateCustomTheme = async () => {
    if (!editingThemeId) return;
    if (!newTheme.name.trim()) {
      toast.error('Please enter a theme name');
      return;
    }
    // Validate all 5 colors are defined
    const requiredColors = ['headerBg', 'bodyBg', 'buttonBg', 'accentColor', 'dividerColor'] as const;
    const missingColors = requiredColors.filter(key => !newTheme.colors[key] || newTheme.colors[key] === '');
    if (missingColors.length > 0) {
      toast.error('All 5 theme colors are required');
      return;
    }

    const dbId = editingThemeId.replace('custom-', '');
    setIsSavingTheme(true);
    
    try {
      const { data, error } = await supabase
        .from('email_themes')
        .update({
          name: newTheme.name,
          description: newTheme.description,
          header_bg: newTheme.colors.headerBg,
          header_text: newTheme.colors.headerText,
          body_bg: newTheme.colors.bodyBg,
          body_text: newTheme.colors.bodyText,
          button_bg: newTheme.colors.buttonBg,
          button_text: newTheme.colors.buttonText,
          accent_color: newTheme.colors.accentColor,
          divider_color: newTheme.colors.dividerColor,
        })
        .eq('id', dbId)
        .select()
        .single();

      if (error) throw error;

      const updatedTheme: EmailTheme = {
        id: editingThemeId,
        name: data.name,
        description: data.description || 'Custom theme',
        category: newTheme.category || [],
        colors: {
          headerBg: data.header_bg,
          headerText: data.header_text,
          bodyBg: data.body_bg,
          bodyText: data.body_text,
          buttonBg: data.button_bg,
          buttonText: data.button_text || '#ffffff',
          accentColor: data.accent_color,
          dividerColor: data.divider_color,
          white: newTheme.colors.white || '#ffffff',
        },
      };

      setCustomThemes(prev => prev.map(t => t.id === editingThemeId ? updatedTheme : t));
      handleCloseThemeDialog();
      toast.success('Theme updated!');
    } catch (error: any) {
      console.error('Error updating theme:', error);
      toast.error('Failed to update theme');
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleCloseThemeDialog = () => {
    setIsCreateThemeOpen(false);
    setEditingThemeId(null);
    setNewTheme({
      name: '',
      description: '',
      category: [],
      colors: {
        headerBg: '#1a1a1a',
        headerText: '#f5f0e8',
        bodyBg: '#f5f0e8',
        bodyText: '#1a1a1a',
        buttonBg: '#1a1a1a',
        buttonText: '#ffffff',
        accentColor: '#d4c5b0',
        dividerColor: '#d4c5b0',
        white: '#ffffff',
      },
    });
  };

  // Combined themes (built-in + custom)
  const allThemes = [...emailThemes, ...customThemes];
  
  // Current theme for passing to color pickers
  const currentTheme = allThemes.find(t => t.id === selectedTheme) || emailThemes[0];

  const updateBlocksAndHtml = useCallback((newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks);
    const html = blocksToHtml(newBlocks);
    setRawHtml(html);
    onHtmlChange(html);
    onBlocksChange?.(newBlocks);
  }, [onHtmlChange, onBlocksChange, setBlocks]);

  // Regenerate HTML on initial mount to ensure latest blocksToHtml logic is used (e.g., absolute URLs)
  useEffect(() => {
    if (blocks.length > 0) {
      const html = blocksToHtml(blocks);
      setRawHtml(html);
      onHtmlChange(html);
    }
    // Only run on mount - we intentionally exclude blocks and onHtmlChange from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose regenerateHtml method via ref for parent to force refresh HTML from blocks
  useImperativeHandle(ref, () => ({
    regenerateHtml: () => {
      if (blocks.length > 0) {
        const html = blocksToHtml(blocks);
        setRawHtml(html);
        onHtmlChange(html);
      }
    }
  }), [blocks, onHtmlChange]);

  const handleUndo = useCallback(() => {
    const previousBlocks = undo();
    if (previousBlocks) {
      const html = blocksToHtml(previousBlocks);
      setRawHtml(html);
      onHtmlChange(html);
    }
  }, [undo, onHtmlChange]);

  const handleRedo = useCallback(() => {
    const nextBlocks = redo();
    if (nextBlocks) {
      const html = blocksToHtml(nextBlocks);
      setRawHtml(html);
      onHtmlChange(html);
    }
  }, [redo, onHtmlChange]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const addBlock = (type: BlockType, buttonVariant?: 'primary' | 'secondary') => {
    // Prevent duplicate header or footer blocks
    if (type === 'header' && blocks.some(b => b.type === 'header')) {
      toast.error('Only one header block allowed per template');
      return;
    }
    if (type === 'footer' && blocks.some(b => b.type === 'footer')) {
      toast.error('Only one footer block allowed per template');
      return;
    }
    
    // Get the current theme colors for new blocks
    const currentTheme = allThemes.find(t => t.id === selectedTheme) || emailThemes[0];
    
    const newBlock: EmailBlock = {
      id: crypto.randomUUID(),
      type,
      content: type === 'heading' ? 'New Heading' : type === 'text' ? 'New text block...' : type === 'button' ? 'Click Here' : type === 'link' ? 'Click here to learn more' : '',
      styles: {
        textAlign: type === 'link' ? 'left' : 'center',
        fontSize: type === 'heading' ? '24px' : '16px',
        padding: '16px',
        // Apply theme colors based on block type
        ...(type === 'heading' && { 
          backgroundColor: currentTheme.colors.headerBg, 
          textColor: currentTheme.colors.headerText 
        }),
        ...(type === 'text' && { 
          backgroundColor: currentTheme.colors.bodyBg, 
          textColor: currentTheme.colors.bodyText 
        }),
        ...(type === 'button' && { 
          buttonColor: currentTheme.colors.buttonBg, 
          buttonTextColor: currentTheme.colors.buttonText, 
          borderRadius: '8px',
          backgroundColor: currentTheme.colors.bodyBg,
          buttonVariant: buttonVariant || 'primary'
        }),
        ...(type === 'link' && { 
          backgroundColor: currentTheme.colors.bodyBg, 
          textColor: currentTheme.colors.bodyText,
          buttonColor: currentTheme.colors.buttonBg
        }),
        ...(type === 'image' && { 
          backgroundColor: currentTheme.colors.bodyBg,
          textAlign: 'center',
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 0,
          padding: '0px',
          width: '100%',
        }),
        ...(type === 'divider' && { 
          textColor: currentTheme.colors.dividerColor 
        }),
        ...(type === 'spacer' && { height: '24px' }),
        ...(type === 'social' && { 
          backgroundColor: currentTheme.colors.bodyBg,
          buttonColor: currentTheme.colors.buttonBg
        }),
        ...(type === 'footer' && {
          backgroundColor: currentTheme.colors.headerBg,
          textColor: currentTheme.colors.headerText,
          buttonColor: currentTheme.colors.headerText,
          padding: '32px 24px',
          borderRadius: '0 0 12px 12px'
        }),
        ...(type === 'header' && {
          backgroundColor: currentTheme.colors.headerBg,
          textColor: currentTheme.colors.headerText,
          padding: '20px 24px',
          borderRadius: '12px 12px 0 0'
        }),
      },
      ...(type === 'button' && { linkUrl: '{{dashboard_url}}' }),
      ...(type === 'link' && { linkUrl: '{{dashboard_url}}' }),
      ...(type === 'social' && { 
        socialLinks: [
          { platform: 'instagram' as const, url: '', enabled: false },
          { platform: 'tiktok' as const, url: '', enabled: false },
          { platform: 'email' as const, url: '', enabled: false },
        ]
      }),
      ...(type === 'footer' && {
        socialLinks: [
          { platform: 'instagram' as const, url: '', enabled: false },
          { platform: 'tiktok' as const, url: '', enabled: false },
          { platform: 'email' as const, url: '', enabled: false },
        ],
        footerConfig: {
          showLogo: true,
          logoId: 'brand-primary-white',
          logoSize: 'large' as const,
          logoPosition: 'center' as const,
          showSocialIcons: true,
          copyrightText: '© 2026 All rights reserved.',
        }
      }),
      ...(type === 'header' && {
        navLinks: [
          { label: 'Dashboard Login', url: '/login', enabled: true },
        ],
        headerConfig: {
          showLogo: true,
          logoId: 'brand-secondary-white',
          logoSize: 'small' as const,
          logoPosition: 'left' as const,
          showNavLinks: true,
          navLinksPosition: 'right' as const,
        }
      }),
      ...(type === 'signature' && {
        signatureConfig: {
          name: 'Your Name',
          title: 'Your Title',
          imageUrl: '',
          layout: 'horizontal-left' as const,
        }
      }),
      ...(type === 'columns' && {
        columnsConfig: {
          columnCount: (buttonVariant === 'secondary' ? 3 : 2) as 2 | 3,
          columns: [], // Legacy - keep empty
          columnBlocks: buttonVariant === 'secondary' 
            ? [
                [{ id: crypto.randomUUID(), type: 'text' as const, content: 'Column 1', styles: { textAlign: 'center' as const, fontSize: '14px', padding: '8px' } }],
                [{ id: crypto.randomUUID(), type: 'text' as const, content: 'Column 2', styles: { textAlign: 'center' as const, fontSize: '14px', padding: '8px' } }],
                [{ id: crypto.randomUUID(), type: 'text' as const, content: 'Column 3', styles: { textAlign: 'center' as const, fontSize: '14px', padding: '8px' } }],
              ] as EmailBlock[][]
            : [
                [{ id: crypto.randomUUID(), type: 'text' as const, content: 'Column 1', styles: { textAlign: 'center' as const, fontSize: '14px', padding: '8px' } }],
                [{ id: crypto.randomUUID(), type: 'text' as const, content: 'Column 2', styles: { textAlign: 'center' as const, fontSize: '14px', padding: '8px' } }],
              ] as EmailBlock[][],
          gap: 16,
        }
      }),
    };
    
    // Insert header at the beginning, footer at the end, others at the end
    if (type === 'header') {
      updateBlocksAndHtml([newBlock, ...blocks]);
    } else if (type === 'footer') {
      updateBlocksAndHtml([...blocks, newBlock]);
    } else {
      // Insert other blocks before any existing footer, or at the end
      const footerIndex = blocks.findIndex(b => b.type === 'footer');
      if (footerIndex !== -1) {
        const newBlocks = [...blocks];
        newBlocks.splice(footerIndex, 0, newBlock);
        updateBlocksAndHtml(newBlocks);
      } else {
        updateBlocksAndHtml([...blocks, newBlock]);
      }
    }
    setSelectedBlockId(newBlock.id);
  };

  const addLogoBlock = (logo: BrandLogo) => {
    const currentTheme = allThemes.find(t => t.id === selectedTheme) || emailThemes[0];
    const variantLabel = logo.variant === 'white' ? '(White)' : '(Black)';
    
    const newBlock: EmailBlock = {
      id: crypto.randomUUID(),
      type: 'image',
      content: `${logo.name} ${variantLabel}`,
      styles: {
        backgroundColor: currentTheme.colors.headerBg,
        textAlign: 'center',
        padding: '24px',
        width: '180px',
      },
      imageUrl: logo.src,
    };
    updateBlocksAndHtml([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    toast.success(`Added ${logo.name} ${variantLabel}`);
  };

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    const newBlocks = blocks.map(block => 
      block.id === id ? { ...block, ...updates } : block
    );
    updateBlocksAndHtml(newBlocks);
  };

  const updateBlockStyles = (id: string, styleUpdates: Partial<EmailBlock['styles']>) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    updateBlock(id, { styles: { ...block.styles, ...styleUpdates } });
  };

  // Apply inline formatting to selected text using document.execCommand for contenteditable
  const applyInlineFormat = useCallback((blockId: string, tag: 'strong' | 'em') => {
    const editableDiv = contentEditableRef.current;
    if (!editableDiv) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      toast.error('Please select text to format');
      return;
    }
    
    // Use execCommand for bold/italic
    const command = tag === 'strong' ? 'bold' : 'italic';
    document.execCommand(command, false);
    
    // Update block content from the contenteditable
    updateBlock(blockId, { content: editableDiv.innerHTML });
    
    // Restore focus
    editableDiv.focus();
  }, [updateBlock]);

  const applyLinkFormat = useCallback((blockId: string) => {
    const editableDiv = contentEditableRef.current;
    if (!editableDiv) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      toast.error('Please select text to create a link');
      return;
    }
    
    const selectedText = selection.toString();
    
    // Prompt for URL
    const url = window.prompt('Enter the URL for the link:', 'https://');
    if (!url || url === 'https://') return;
    
    // Use execCommand to create link
    document.execCommand('createLink', false, url);
    
    // Update block content from the contenteditable
    updateBlock(blockId, { content: editableDiv.innerHTML });
    
    // Restore focus
    editableDiv.focus();
  }, [updateBlock]);

  const deleteBlock = (id: string) => {
    updateBlocksAndHtml(blocks.filter(block => block.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;
    
    const newBlocks = [...blocks];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
    updateBlocksAndHtml(newBlocks);
  };

  const duplicateBlock = (id: string) => {
    const blockToDuplicate = blocks.find(b => b.id === id);
    if (!blockToDuplicate) return;
    
    const duplicatedBlock: EmailBlock = {
      ...blockToDuplicate,
      id: crypto.randomUUID(),
      styles: { ...blockToDuplicate.styles },
    };
    
    const index = blocks.findIndex(b => b.id === id);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, duplicatedBlock);
    updateBlocksAndHtml(newBlocks);
    setSelectedBlockId(duplicatedBlock.id);
    toast.success('Block duplicated');
  };

  // Convert a block to a columns layout
  const convertToColumns = (id: string, columnCount: 2 | 3) => {
    const blockToConvert = blocks.find(b => b.id === id);
    if (!blockToConvert) return;
    
    // Don't convert header, footer, or already columns blocks
    if (blockToConvert.type === 'header' || blockToConvert.type === 'footer' || blockToConvert.type === 'columns') {
      toast.error(`Cannot convert ${blockToConvert.type} to columns`);
      return;
    }
    
    // Get current theme for consistent styling
    const currentTheme = allThemes.find(t => t.id === selectedTheme) || emailThemes[0];
    
    // Create a copy of the original block to place in the first column
    const originalBlockCopy: EmailBlock = {
      ...blockToConvert,
      id: crypto.randomUUID(),
      styles: { ...blockToConvert.styles },
    };
    
    // Create empty placeholder blocks for additional columns
    const createPlaceholderBlock = (): EmailBlock => ({
      id: crypto.randomUUID(),
      type: 'text',
      content: 'Add content here...',
      styles: {
        textAlign: 'center',
        fontSize: '14px',
        padding: '8px',
        textColor: currentTheme.colors.bodyText,
      },
    });
    
    // Build column blocks array
    const columnBlocks: EmailBlock[][] = [[originalBlockCopy]];
    for (let i = 1; i < columnCount; i++) {
      columnBlocks.push([createPlaceholderBlock()]);
    }
    
    // Create new columns block
    const columnsBlock: EmailBlock = {
      id: crypto.randomUUID(),
      type: 'columns',
      content: '',
      styles: {
        backgroundColor: blockToConvert.styles.backgroundColor || currentTheme.colors.bodyBg,
        padding: blockToConvert.styles.padding || '16px',
        paddingTop: blockToConvert.styles.paddingTop,
        paddingBottom: blockToConvert.styles.paddingBottom,
        paddingHorizontal: blockToConvert.styles.paddingHorizontal,
      },
      columnsConfig: {
        columnCount,
        columns: [],
        columnBlocks,
        gap: 16,
      },
    };
    
    // Replace the original block with the columns block
    const index = blocks.findIndex(b => b.id === id);
    const newBlocks = [...blocks];
    newBlocks[index] = columnsBlock;
    updateBlocksAndHtml(newBlocks);
    setSelectedBlockId(columnsBlock.id);
    toast.success(`Converted to ${columnCount}-column layout`);
  };

  // Unwrap a columns block back into individual blocks
  const unwrapColumns = (id: string) => {
    const columnsBlock = blocks.find(b => b.id === id);
    if (!columnsBlock || columnsBlock.type !== 'columns') {
      toast.error('This block cannot be unwrapped');
      return;
    }
    
    // Extract all blocks from all columns
    const extractedBlocks: EmailBlock[] = [];
    const columnBlocks = columnsBlock.columnsConfig?.columnBlocks || [];
    
    for (const column of columnBlocks) {
      for (const block of column) {
        // Create a new copy with fresh ID to avoid conflicts
        extractedBlocks.push({
          ...block,
          id: crypto.randomUUID(),
          styles: { ...block.styles },
        });
      }
    }
    
    if (extractedBlocks.length === 0) {
      toast.error('No blocks to unwrap');
      return;
    }
    
    // Find the index of the columns block and replace it with extracted blocks
    const index = blocks.findIndex(b => b.id === id);
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1, ...extractedBlocks);
    updateBlocksAndHtml(newBlocks);
    
    // Select the first extracted block
    setSelectedBlockId(extractedBlocks[0].id);
    toast.success(`Unwrapped ${extractedBlocks.length} block${extractedBlocks.length > 1 ? 's' : ''} from columns`);
  };

  // Helper to get section type for visual grouping
  const getSectionType = (blockType: string): { label: string; color: string } => {
    switch (blockType) {
      case 'header':
        return { label: 'Header Section', color: 'hsl(var(--primary))' };
      case 'footer':
        return { label: 'Footer Section', color: 'hsl(var(--primary))' };
      case 'heading':
      case 'text':
        return { label: 'Content Section', color: 'hsl(var(--accent-foreground))' };
      case 'button':
      case 'link':
        return { label: 'Action Section', color: 'hsl(142 76% 36%)' }; // green
      case 'image':
        return { label: 'Media Section', color: 'hsl(271 91% 65%)' }; // purple
      case 'social':
        return { label: 'Social Section', color: 'hsl(221 83% 53%)' }; // blue
      case 'divider':
      case 'spacer':
        return { label: 'Layout Section', color: 'hsl(var(--muted-foreground))' };
      case 'columns':
        return { label: 'Columns Section', color: 'hsl(280 70% 55%)' }; // violet
      default:
        return { label: 'Block', color: 'hsl(var(--muted-foreground))' };
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlockId(blockId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
    
    // Create custom drag ghost
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      const ghost = document.createElement('div');
      ghost.className = 'bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2';
      ghost.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
        <span style="text-transform: capitalize;">${block.type === 'social' ? 'Social Icons' : block.type}</span>
      `;
      ghost.style.position = 'absolute';
      ghost.style.top = '-1000px';
      ghost.style.left = '-1000px';
      document.body.appendChild(ghost);
      
      e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
      
      // Clean up the ghost element after drag starts
      requestAnimationFrame(() => {
        document.body.removeChild(ghost);
      });
    }
  };

  const handleDragOver = (e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedBlockId && blockId !== draggedBlockId) {
      setDragOverBlockId(blockId);
      // Determine if dropping above or below based on mouse position
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      setDropPosition(e.clientY < midpoint ? 'above' : 'below');
    }
  };

  const handleDragLeave = () => {
    setDragOverBlockId(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      setDropPosition(null);
      return;
    }

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId);
    const targetIndex = blocks.findIndex(b => b.id === targetBlockId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      setDropPosition(null);
      return;
    }

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    
    // Insert at correct position based on drop position
    let insertIndex = targetIndex;
    if (dropPosition === 'below') {
      insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
      insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }
    
    newBlocks.splice(insertIndex, 0, draggedBlock);
    
    updateBlocksAndHtml(newBlocks);
    
    // Trigger animation on the moved block
    setRecentlyMovedBlockId(draggedBlockId);
    setTimeout(() => setRecentlyMovedBlockId(null), 400);
    
    setDraggedBlockId(null);
    setDragOverBlockId(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedBlockId(null);
    setDragOverBlockId(null);
    setDropPosition(null);
    setMainBlockDragTarget(null);
  };

  // Column item drag and drop handlers
  const handleColumnItemDragStart = (
    e: React.DragEvent,
    blockId: string,
    colIndex: number,
    itemIndex: number,
    item: ColumnContent
  ) => {
    e.stopPropagation();
    setDraggedColumnItem({ blockId, colIndex, itemIndex, item });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `column-item-${item.id}`);
    
    // Create custom drag ghost
    const ghost = document.createElement('div');
    ghost.className = 'bg-primary text-primary-foreground px-3 py-1.5 rounded shadow-lg text-xs font-medium flex items-center gap-1.5';
    ghost.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
        <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
      </svg>
      <span style="text-transform: capitalize;">${item.type}</span>
    `;
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.left = '-1000px';
    document.body.appendChild(ghost);
    
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
    
    requestAnimationFrame(() => {
      document.body.removeChild(ghost);
    });
  };

  const handleColumnItemDragOver = (
    e: React.DragEvent,
    blockId: string,
    colIndex: number,
    itemIndex: number | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedColumnItem) return;
    
    e.dataTransfer.dropEffect = 'move';
    setDropTargetColumn({ blockId, colIndex, itemIndex });
  };

  const handleColumnItemDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    // Only clear if we're leaving the columns area entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget?.closest('[data-column-drop-zone]')) {
      setDropTargetColumn(null);
    }
  };

  const handleColumnItemDrop = (
    e: React.DragEvent,
    targetBlockId: string,
    targetColIndex: number,
    targetItemIndex: number | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedColumnItem) {
      setDropTargetColumn(null);
      return;
    }
    
    const { blockId: sourceBlockId, colIndex: sourceColIndex, itemIndex: sourceItemIndex, item } = draggedColumnItem;
    
    // Find the source block
    const sourceBlock = blocks.find(b => b.id === sourceBlockId);
    const targetBlock = blocks.find(b => b.id === targetBlockId);
    
    if (!sourceBlock?.columnsConfig || !targetBlock?.columnsConfig) {
      setDraggedColumnItem(null);
      setDropTargetColumn(null);
      return;
    }
    
    // Clone the blocks array
    const newBlocks = blocks.map(b => ({ ...b }));
    const sourceBlockIndex = newBlocks.findIndex(b => b.id === sourceBlockId);
    const targetBlockIndex = newBlocks.findIndex(b => b.id === targetBlockId);
    
    if (sourceBlockIndex === -1 || targetBlockIndex === -1) {
      setDraggedColumnItem(null);
      setDropTargetColumn(null);
      return;
    }
    
    // Deep clone columns configs
    const newSourceConfig = {
      ...newBlocks[sourceBlockIndex].columnsConfig!,
      columns: newBlocks[sourceBlockIndex].columnsConfig!.columns.map(col => [...col])
    };
    const newTargetConfig = sourceBlockId === targetBlockId ? newSourceConfig : {
      ...newBlocks[targetBlockIndex].columnsConfig!,
      columns: newBlocks[targetBlockIndex].columnsConfig!.columns.map(col => [...col])
    };
    
    // Remove from source
    newSourceConfig.columns[sourceColIndex].splice(sourceItemIndex, 1);
    
    // Calculate insertion index
    let insertIndex: number;
    if (targetItemIndex === null) {
      // Dropping at end of column
      insertIndex = newTargetConfig.columns[targetColIndex].length;
    } else {
      // Dropping at specific position
      // If same column and dragging down, adjust index
      if (sourceBlockId === targetBlockId && sourceColIndex === targetColIndex && sourceItemIndex < targetItemIndex) {
        insertIndex = targetItemIndex - 1;
      } else {
        insertIndex = targetItemIndex;
      }
    }
    
    // Insert at target
    newTargetConfig.columns[targetColIndex].splice(insertIndex, 0, item);
    
    // Update blocks
    newBlocks[sourceBlockIndex] = { ...newBlocks[sourceBlockIndex], columnsConfig: newSourceConfig };
    if (sourceBlockId !== targetBlockId) {
      newBlocks[targetBlockIndex] = { ...newBlocks[targetBlockIndex], columnsConfig: newTargetConfig };
    }
    
    updateBlocksAndHtml(newBlocks);
    
    setDraggedColumnItem(null);
    setDropTargetColumn(null);
  };

  const handleColumnItemDragEnd = () => {
    setDraggedColumnItem(null);
    setDropTargetColumn(null);
  };

  // Column block drag and drop handlers (for full EmailBlock in columns)
  const handleColumnBlockDragStart = (
    e: React.DragEvent,
    parentBlockId: string,
    colIndex: number,
    blockIndex: number,
    block: EmailBlock
  ) => {
    e.stopPropagation();
    setDraggedColumnBlock({ parentBlockId, colIndex, blockIndex, block });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `column-block-${block.id}`);
    
    // Create custom drag ghost
    const ghost = document.createElement('div');
    ghost.className = 'bg-primary text-primary-foreground px-3 py-1.5 rounded shadow-lg text-xs font-medium flex items-center gap-1.5';
    ghost.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
        <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
      </svg>
      <span style="text-transform: capitalize;">${block.type}</span>
    `;
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.left = '-1000px';
    document.body.appendChild(ghost);
    
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
    
    requestAnimationFrame(() => {
      document.body.removeChild(ghost);
    });
  };

  const handleColumnBlockDragOver = (
    e: React.DragEvent,
    parentBlockId: string,
    colIndex: number,
    blockIndex: number | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedColumnBlock) return;
    
    e.dataTransfer.dropEffect = 'move';
    setDropTargetColumnBlock({ parentBlockId, colIndex, blockIndex });
  };

  const handleColumnBlockDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget?.closest('[data-column-block-drop-zone]')) {
      setDropTargetColumnBlock(null);
    }
  };

  const handleColumnBlockDrop = (
    e: React.DragEvent,
    targetParentBlockId: string,
    targetColIndex: number,
    targetBlockIndex: number | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedColumnBlock) {
      setDropTargetColumnBlock(null);
      return;
    }
    
    const { parentBlockId: sourceParentBlockId, colIndex: sourceColIndex, blockIndex: sourceBlockIndex, block } = draggedColumnBlock;
    
    // Find the source and target parent blocks
    const sourceParentBlock = blocks.find(b => b.id === sourceParentBlockId);
    const targetParentBlock = blocks.find(b => b.id === targetParentBlockId);
    
    if (!sourceParentBlock?.columnsConfig?.columnBlocks || !targetParentBlock?.columnsConfig?.columnBlocks) {
      setDraggedColumnBlock(null);
      setDropTargetColumnBlock(null);
      return;
    }
    
    // Clone the blocks array
    const newBlocks = blocks.map(b => ({ ...b }));
    const sourceParentIndex = newBlocks.findIndex(b => b.id === sourceParentBlockId);
    const targetParentIndex = newBlocks.findIndex(b => b.id === targetParentBlockId);
    
    if (sourceParentIndex === -1 || targetParentIndex === -1) {
      setDraggedColumnBlock(null);
      setDropTargetColumnBlock(null);
      return;
    }
    
    // Deep clone columns configs
    const newSourceConfig = {
      ...newBlocks[sourceParentIndex].columnsConfig!,
      columnBlocks: newBlocks[sourceParentIndex].columnsConfig!.columnBlocks!.map(col => [...col])
    };
    const newTargetConfig = sourceParentBlockId === targetParentBlockId ? newSourceConfig : {
      ...newBlocks[targetParentIndex].columnsConfig!,
      columnBlocks: newBlocks[targetParentIndex].columnsConfig!.columnBlocks!.map(col => [...col])
    };
    
    // Remove from source
    newSourceConfig.columnBlocks![sourceColIndex].splice(sourceBlockIndex, 1);
    
    // Calculate insertion index
    let insertIndex: number;
    if (targetBlockIndex === null) {
      // Dropping at end of column
      insertIndex = newTargetConfig.columnBlocks![targetColIndex].length;
    } else {
      // Dropping at specific position
      // If same column and dragging down, adjust index
      if (sourceParentBlockId === targetParentBlockId && sourceColIndex === targetColIndex && sourceBlockIndex < targetBlockIndex) {
        insertIndex = targetBlockIndex - 1;
      } else {
        insertIndex = targetBlockIndex;
      }
    }
    
    // Insert at target
    newTargetConfig.columnBlocks![targetColIndex].splice(insertIndex, 0, block);
    
    // Update blocks
    newBlocks[sourceParentIndex] = { ...newBlocks[sourceParentIndex], columnsConfig: newSourceConfig };
    if (sourceParentBlockId !== targetParentBlockId) {
      newBlocks[targetParentIndex] = { ...newBlocks[targetParentIndex], columnsConfig: newTargetConfig };
    }
    
    updateBlocksAndHtml(newBlocks);
    
    setDraggedColumnBlock(null);
    setDropTargetColumnBlock(null);
  };

  const handleColumnBlockDragEnd = () => {
    setDraggedColumnBlock(null);
    setDropTargetColumnBlock(null);
    setColumnBlockToMainTarget(null);
  };

  // Cross-drag: Main block being dragged over a column drop zone
  const handleMainBlockDragOverColumn = (
    e: React.DragEvent,
    parentBlockId: string,
    colIndex: number,
    blockIndex: number | null
  ) => {
    // Only accept if we're dragging a main block (not a column block)
    if (!draggedBlockId || draggedColumnBlock) return;
    
    // Check if the block type is allowed in columns
    const block = blocks.find(b => b.id === draggedBlockId);
    if (!block) return;
    
    const disallowedTypes: BlockType[] = ['header', 'footer', 'columns'];
    if (disallowedTypes.includes(block.type)) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setMainBlockDragTarget({ parentBlockId, colIndex, blockIndex });
  };

  const handleMainBlockDragLeaveColumn = (e: React.DragEvent) => {
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget?.closest('[data-column-block-drop-zone]')) {
      setMainBlockDragTarget(null);
    }
  };

  // Cross-drag: Drop a main block into a column
  const handleMainBlockDropInColumn = (
    e: React.DragEvent,
    targetParentBlockId: string,
    targetColIndex: number,
    targetBlockIndex: number | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedBlockId) {
      setMainBlockDragTarget(null);
      return;
    }
    
    const sourceBlock = blocks.find(b => b.id === draggedBlockId);
    if (!sourceBlock) {
      setMainBlockDragTarget(null);
      setDraggedBlockId(null);
      return;
    }
    
    // Check if the block type is allowed in columns
    const disallowedTypes: BlockType[] = ['header', 'footer', 'columns'];
    if (disallowedTypes.includes(sourceBlock.type)) {
      toast.error(`${sourceBlock.type} blocks cannot be placed in columns`);
      setMainBlockDragTarget(null);
      setDraggedBlockId(null);
      return;
    }
    
    const targetParentBlock = blocks.find(b => b.id === targetParentBlockId);
    if (!targetParentBlock?.columnsConfig?.columnBlocks) {
      setMainBlockDragTarget(null);
      setDraggedBlockId(null);
      return;
    }
    
    // Clone blocks, remove from main list, add to column
    const newBlocks = blocks.filter(b => b.id !== draggedBlockId).map(b => ({ ...b }));
    const targetParentIndex = newBlocks.findIndex(b => b.id === targetParentBlockId);
    
    if (targetParentIndex === -1) {
      setMainBlockDragTarget(null);
      setDraggedBlockId(null);
      return;
    }
    
    // Deep clone column config
    const newTargetConfig = {
      ...newBlocks[targetParentIndex].columnsConfig!,
      columnBlocks: newBlocks[targetParentIndex].columnsConfig!.columnBlocks!.map(col => [...col])
    };
    
    // Insert at target position
    const insertIndex = targetBlockIndex ?? newTargetConfig.columnBlocks![targetColIndex].length;
    newTargetConfig.columnBlocks![targetColIndex].splice(insertIndex, 0, { ...sourceBlock });
    
    newBlocks[targetParentIndex] = { ...newBlocks[targetParentIndex], columnsConfig: newTargetConfig };
    
    updateBlocksAndHtml(newBlocks);
    setSelectedBlockId(null);
    
    setMainBlockDragTarget(null);
    setDraggedBlockId(null);
    setDragOverBlockId(null);
    setDropPosition(null);
    
    toast.success('Block moved into column');
  };

  // Cross-drag: Column block being dragged over main block list
  const handleColumnBlockDragOverMain = (e: React.DragEvent, blockId: string) => {
    if (!draggedColumnBlock) return;
    
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Determine position based on mouse
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position: 'above' | 'below' = e.clientY < midpoint ? 'above' : 'below';
    
    setColumnBlockToMainTarget({ targetBlockId: blockId, position });
  };

  const handleColumnBlockDragLeaveMain = () => {
    setColumnBlockToMainTarget(null);
  };

  // Cross-drag: Drop a column block into main list
  const handleColumnBlockDropToMain = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedColumnBlock || !columnBlockToMainTarget) {
      setDraggedColumnBlock(null);
      setDropTargetColumnBlock(null);
      setColumnBlockToMainTarget(null);
      return;
    }
    
    const { parentBlockId, colIndex, blockIndex, block } = draggedColumnBlock;
    const { position } = columnBlockToMainTarget;
    
    // Find the source parent block
    const sourceParentBlock = blocks.find(b => b.id === parentBlockId);
    if (!sourceParentBlock?.columnsConfig?.columnBlocks) {
      setDraggedColumnBlock(null);
      setDropTargetColumnBlock(null);
      setColumnBlockToMainTarget(null);
      return;
    }
    
    // Clone blocks
    const newBlocks = blocks.map(b => ({ ...b }));
    const sourceParentIndex = newBlocks.findIndex(b => b.id === parentBlockId);
    const targetIndex = newBlocks.findIndex(b => b.id === targetBlockId);
    
    if (sourceParentIndex === -1 || targetIndex === -1) {
      setDraggedColumnBlock(null);
      setDropTargetColumnBlock(null);
      setColumnBlockToMainTarget(null);
      return;
    }
    
    // Deep clone and remove from source column
    const newSourceConfig = {
      ...newBlocks[sourceParentIndex].columnsConfig!,
      columnBlocks: newBlocks[sourceParentIndex].columnsConfig!.columnBlocks!.map(col => [...col])
    };
    newSourceConfig.columnBlocks![colIndex].splice(blockIndex, 1);
    newBlocks[sourceParentIndex] = { ...newBlocks[sourceParentIndex], columnsConfig: newSourceConfig };
    
    // Insert into main list at the correct position
    const insertIndex = position === 'above' ? targetIndex : targetIndex + 1;
    newBlocks.splice(insertIndex, 0, { ...block, id: crypto.randomUUID() });
    
    updateBlocksAndHtml(newBlocks);
    
    // Trigger animation
    setRecentlyMovedBlockId(newBlocks[insertIndex].id);
    setTimeout(() => setRecentlyMovedBlockId(null), 400);
    
    setDraggedColumnBlock(null);
    setDropTargetColumnBlock(null);
    setColumnBlockToMainTarget(null);
    
    toast.success('Block moved out of column');
  };

  const handleImageUpload = async (blockId: string, file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `email-images/${crypto.randomUUID()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('email-assets')
        .upload(fileName, file);

      if (error) {
        // Try to create the bucket if it doesn't exist
        if (error.message.includes('Bucket not found')) {
          toast.error('Storage bucket not configured. Please contact an administrator.');
          return;
        }
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('email-assets')
        .getPublicUrl(fileName);

      updateBlock(blockId, { imageUrl: urlData.publicUrl });
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const compressImage = (file: File, maxWidth: number = 400, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Open crop modal before uploading signature image
  const handleSignatureFileSelect = (blockId: string, file: File) => {
    setCropTargetBlockId(blockId);
    setCropImageFile(file);
    setCropModalOpen(true);
  };

  // Handle cropped image upload
  const handleCroppedImageUpload = async (croppedBlob: Blob, _focalX?: number, _focalY?: number, _cardFocalX?: number, _cardFocalY?: number) => {
    if (!cropTargetBlockId) return;
    
    setIsUploading(true);
    try {
      const fileName = `signature-images/${crypto.randomUUID()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('email-assets')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg'
        });

      if (error) {
        if (error.message.includes('Bucket not found')) {
          toast.error('Storage bucket not configured. Please contact an administrator.');
          return;
        }
        if (error.message.includes('maximum allowed size')) {
          toast.error('Image is too large. Please use a smaller image.');
          return;
        }
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('email-assets')
        .getPublicUrl(fileName);

      const block = blocks.find(b => b.id === cropTargetBlockId);
      if (block && block.signatureConfig) {
        updateBlock(cropTargetBlockId, { 
          signatureConfig: { ...block.signatureConfig, imageUrl: urlData.publicUrl }
        });
      }
      toast.success('Signature image uploaded');
    } catch (error: any) {
      console.error('Error uploading signature image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      setCropTargetBlockId(null);
      setCropImageFile(null);
    }
  };

  const insertVariable = (variable: string) => {
    if (!selectedBlockId) {
      toast.error('Select a block first to insert a variable');
      return;
    }
    const block = blocks.find(b => b.id === selectedBlockId);
    if (!block) return;
    
    if (block.type === 'button') {
      updateBlock(selectedBlockId, { linkUrl: `{{${variable}}}` });
    } else {
      updateBlock(selectedBlockId, { content: block.content + `{{${variable}}}` });
    }
  };

  const handleRawHtmlChange = (html: string) => {
    setRawHtml(html);
    onHtmlChange(html);
  };

  const applyTheme = (themeId: string) => {
    const theme = allThemes.find(t => t.id === themeId);
    if (!theme) return;

    setSelectedTheme(themeId);
    
    const newBlocks = blocks.map(block => {
      const updatedStyles = { ...block.styles };
      
      if (block.type === 'heading') {
        updatedStyles.backgroundColor = theme.colors.headerBg;
        updatedStyles.textColor = theme.colors.headerText;
      } else if (block.type === 'text') {
        updatedStyles.backgroundColor = theme.colors.bodyBg;
        updatedStyles.textColor = theme.colors.bodyText;
      } else if (block.type === 'button') {
        updatedStyles.buttonColor = theme.colors.buttonBg;
        updatedStyles.buttonTextColor = theme.colors.buttonText;
        updatedStyles.backgroundColor = theme.colors.bodyBg;
      } else if (block.type === 'divider') {
        updatedStyles.textColor = theme.colors.dividerColor;
      } else if (block.type === 'image') {
        updatedStyles.backgroundColor = theme.colors.bodyBg;
      }
      
      return { ...block, styles: updatedStyles };
    });
    
    updateBlocksAndHtml(newBlocks);
    toast.success(`Applied "${theme.name}" theme`);
  };

  // URL validation helper
  const isValidUrl = (url: string): boolean => {
    // Allow variables and placeholders
    if (url.includes('[') || url.includes('{{') || url === '#') return true;
    // Check for valid URL format
    try {
      // Allow relative URLs starting with /
      if (url.startsWith('/')) return true;
      // Allow mailto and tel links
      if (url.startsWith('mailto:') || url.startsWith('tel:')) return true;
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Extract and validate all links from blocks
  const getLinkValidation = useCallback(() => {
    const issues: { blockType: string; url: string; label: string }[] = [];
    
    blocks.forEach((block) => {
      // Check button/link URLs
      if ((block.type === 'button' || block.type === 'link') && block.linkUrl) {
        if (!isValidUrl(block.linkUrl)) {
          issues.push({
            blockType: block.type,
            url: block.linkUrl,
            label: block.content || block.type,
          });
        }
      }
      // Check nav links in header
      if (block.type === 'header' && block.navLinks) {
        block.navLinks.forEach((link) => {
          if (link.enabled && link.url && !isValidUrl(link.url)) {
            issues.push({
              blockType: 'nav link',
              url: link.url,
              label: link.label,
            });
          }
        });
      }
      // Check social links
      if (block.socialLinks) {
        block.socialLinks.forEach((link) => {
          if (link.enabled && link.url && !isValidUrl(link.url)) {
            issues.push({
              blockType: 'social link',
              url: link.url,
              label: link.platform,
            });
          }
        });
      }
    });
    
    return issues;
  }, [blocks]);

  const renderPreviewHtml = (html: string) => {
    let preview = html;
    variables.forEach((variable) => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      // Replace variables differently based on context
      // First, handle variables inside href/src attributes by just showing [variable] as text
      preview = preview.replace(
        new RegExp(`(href|src)="([^"]*?){{${variable}}}([^"]*?)"`, 'g'),
        `$1="$2[${variable}]$3"`
      );
      // Then handle remaining variables (in text content) with highlighted spans
      const placeholder = `<span style="background: #fef3c7; padding: 2px 6px; border-radius: 4px;">[${variable}]</span>`;
      preview = preview.replace(regex, placeholder);
    });
    // Make all links open in new tab for testing
    preview = preview.replace(/<a\s+href="/g, '<a target="_blank" rel="noopener noreferrer" href="');
    return preview;
  };

  return (
    <div className="space-y-4 relative">
      {/* Sticky Undo/Redo floating controls */}
      <div className="fixed bottom-24 right-6 z-50 flex items-center gap-1 border rounded-lg p-1.5 bg-background/95 backdrop-blur-sm shadow-lg">
        <Button
          variant="ghost"
          size={tokens.button.inline}
          onClick={handleUndo}
          disabled={!canUndo}
          className="h-8 w-8 p-0"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-border" />
        <Button
          variant="ghost"
          size={tokens.button.inline}
          onClick={handleRedo}
          disabled={!canRedo}
          className="h-8 w-8 p-0"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="flex items-center justify-between gap-4 mb-2">
          <TabsList className="flex-1">
            <TabsTrigger value="visual" className="flex-1 gap-2">
              <Palette className="w-4 h-4" />
              Visual Editor
            </TabsTrigger>
            <TabsTrigger value="code" className="flex-1 gap-2">
              <Code className="w-4 h-4" />
              HTML Code
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1 gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visual" className="mt-4 space-y-4">
          {/* Horizontal Toolbar */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border shadow-sm">
            <Button
              variant={toolbarPanel === 'themes' ? 'default' : 'outline'}
              size={tokens.button.inline}
              className={cn("gap-2 px-4 shadow-sm", toolbarPanel !== 'themes' && "bg-background border-border/80")}
              onClick={() => setToolbarPanel(toolbarPanel === 'themes' ? null : 'themes')}
            >
              <Palette className="w-4 h-4" />
              Themes
            </Button>
            <Button
              variant={toolbarPanel === 'blocks' ? 'default' : 'outline'}
              size={tokens.button.inline}
              className={cn("gap-2 px-4 shadow-sm", toolbarPanel !== 'blocks' && "bg-background border-border/80")}
              onClick={() => setToolbarPanel(toolbarPanel === 'blocks' ? null : 'blocks')}
            >
              <Plus className="w-4 h-4" />
              Add Block
            </Button>
            {variables.length > 0 && (
              <Button
                variant={toolbarPanel === 'variables' ? 'default' : 'outline'}
                size={tokens.button.inline}
                className={cn("gap-2 px-4 shadow-sm", toolbarPanel !== 'variables' && "bg-background border-border/80")}
                onClick={() => setToolbarPanel(toolbarPanel === 'variables' ? null : 'variables')}
              >
                <Variable className="w-4 h-4" />
                Variables
              </Button>
            )}
            
            <div className="flex-1" />
          </div>

          {/* Themes Panel */}
          {toolbarPanel === 'themes' && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <Tabs defaultValue="standard" className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1" />
                    <TabsList className="h-10 p-1 rounded-full bg-muted/60">
                      <TabsTrigger value="standard" className="text-xs h-8 px-5 rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Standard Themes</TabsTrigger>
                      <TabsTrigger value="custom" className="text-xs h-8 px-5 rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Custom Themes {customThemes.length > 0 && `(${customThemes.length})`}</TabsTrigger>
                    </TabsList>
                    <div className="flex-1 flex justify-end">
                      <Dialog open={isCreateThemeOpen} onOpenChange={(open) => {
                        if (!open) handleCloseThemeDialog();
                        else setIsCreateThemeOpen(true);
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5 shadow-sm">
                            <Plus className="w-3.5 h-3.5" />
                            New Custom Theme
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Sparkles className="w-5 h-5" />
                              {editingThemeId ? 'Edit Custom Theme' : 'Create Custom Theme'}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Theme Name</Label>
                              <Input
                                value={newTheme.name}
                                onChange={(e) => setNewTheme(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="My Brand Theme"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input
                                value={newTheme.description}
                                onChange={(e) => setNewTheme(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Brief description..."
                              />
                            </div>
                            
                            {/* 5 Color Swatches */}
                            <div className="space-y-2">
                              <div className="text-xs font-medium">Theme Colors (5)</div>
                              <div className="flex gap-2 justify-center p-3 rounded-lg border bg-muted/20">
                                {[
                                  { key: 'headerBg', label: 'Dark', color: newTheme.colors.headerBg, colorType: 'dark' as const },
                                  { key: 'bodyBg', label: 'Light', color: newTheme.colors.bodyBg, colorType: 'light' as const },
                                  { key: 'buttonBg', label: 'Primary', color: newTheme.colors.buttonBg, colorType: 'primary' as const },
                                  { key: 'accentColor', label: 'Accent', color: newTheme.colors.accentColor, colorType: 'accent' as const },
                                  { key: 'dividerColor', label: 'Divider', color: newTheme.colors.dividerColor, colorType: 'divider' as const },
                                ].map((item) => (
                                  <Popover key={item.key}>
                                    <PopoverTrigger asChild>
                                      <button className="flex flex-col items-center gap-1 group">
                                        <div
                                          className="w-8 h-8 rounded-full border border-foreground/20 shadow-sm transition-transform group-hover:scale-110"
                                          style={{ backgroundColor: item.color }}
                                        />
                                        <span className="text-[9px] text-muted-foreground">{item.label}</span>
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-3" align="center">
                                      <ColorWheelPicker
                                        value={item.color}
                                        onChange={(color) => setNewTheme(prev => ({
                                          ...prev,
                                          colors: { ...prev.colors, [item.key]: color }
                                        }))}
                                        colorType={item.colorType}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                ))}
                              </div>
                            </div>
                            
                            {/* Theme Preview */}
                            <div className="space-y-2">
                              <div className="text-xs font-medium">Preview</div>
                              <div className="rounded-lg overflow-hidden border shadow-sm" style={{ backgroundColor: newTheme.colors.bodyBg }}>
                                <div className="p-2 text-center" style={{ backgroundColor: newTheme.colors.headerBg, color: newTheme.colors.headerText }}>
                                  <div className="text-[10px] font-medium">Header</div>
                                </div>
                                <div className="p-3" style={{ color: newTheme.colors.bodyText }}>
                                  <div className="text-[10px]">Body text preview</div>
                                  <button className="mt-2 px-3 py-1 rounded text-[9px] font-medium" style={{ backgroundColor: newTheme.colors.buttonBg, color: newTheme.colors.buttonText }}>
                                    Button
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={handleCloseThemeDialog}>
                              Cancel
                            </Button>
                            <Button onClick={editingThemeId ? handleUpdateCustomTheme : handleSaveCustomTheme} disabled={isSavingTheme || !newTheme.name.trim()}>
                              {isSavingTheme ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Save className="w-4 h-4 mr-2" />
                              )}
                              {editingThemeId ? 'Update Theme' : 'Save Theme'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <TabsContent value="standard" className="mt-0">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {themeCategories.map((category) => (
                        <button key={category.id} onClick={() => setThemeCategoryFilter(category.id)} className={cn("px-2.5 py-1 rounded-full text-[10px] font-medium transition-all", themeCategoryFilter === category.id ? "bg-foreground text-background" : "bg-muted hover:bg-muted/80 text-muted-foreground")}>{category.label}</button>
                      ))}
                    </div>
                    <ScrollArea className="h-[220px]">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 pb-2">
                        {emailThemes.filter(theme => themeCategoryFilter === 'all' || theme.category.includes(themeCategoryFilter)).map((theme) => (
                          <div key={theme.id} className={cn('p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md', selectedTheme === theme.id ? 'ring-1 ring-foreground border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30')} onClick={() => { setSelectedTheme(theme.id); applyTheme(theme.id); }}>
                            <div className="flex gap-0.5 mb-1.5">
                              <div className="w-4 h-4 rounded-full border border-foreground/20" style={{ backgroundColor: theme.colors.headerBg }} />
                              <div className="w-4 h-4 rounded-full border border-foreground/20" style={{ backgroundColor: theme.colors.bodyBg }} />
                              <div className="w-4 h-4 rounded-full border border-foreground/20" style={{ backgroundColor: theme.colors.buttonBg }} />
                              <div className="w-4 h-4 rounded-full border border-foreground/20" style={{ backgroundColor: theme.colors.accentColor }} />
                              <div className="w-4 h-4 rounded-full border border-foreground/20" style={{ backgroundColor: theme.colors.dividerColor }} />
                            </div>
                            <div className="text-[10px] font-medium truncate flex items-center gap-1">
                              {theme.id === 'premium-dark' && <Crown className="w-3 h-3 text-amber-500" />}
                              {theme.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="custom" className="mt-0">
                    <ScrollArea className="h-[220px]">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 pb-2">
                        {customThemes.map((theme) => (
                          <div key={theme.id} className={cn('p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md group relative', selectedTheme === theme.id ? 'ring-1 ring-foreground border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30')} onClick={() => { setSelectedTheme(theme.id); applyTheme(theme.id); }}>
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleEditCustomTheme(theme.id); }}><Pencil className="w-2.5 h-2.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteCustomTheme(theme.id); }}><Trash2 className="w-2.5 h-2.5" /></Button>
                            </div>
                            <div className="flex gap-0.5 mb-1.5">
                              <div className="w-4 h-4 rounded-full border border-foreground/20" style={{ backgroundColor: theme.colors.headerBg }} />
                              <div className="w-4 h-4 rounded-full border border-foreground/20" style={{ backgroundColor: theme.colors.bodyBg }} />
                              <div className="w-4 h-4 rounded-full border border-foreground/20" style={{ backgroundColor: theme.colors.buttonBg }} />
                              <div className="w-4 h-4 rounded-full border border-foreground/20" style={{ backgroundColor: theme.colors.accentColor }} />
                              <div className="w-4 h-4 rounded-full border border-foreground/20" style={{ backgroundColor: theme.colors.dividerColor }} />
                            </div>
                            <div className="text-[10px] font-medium truncate flex items-center gap-1"><Sparkles className="w-2.5 h-2.5 text-primary" />{theme.name}</div>
                          </div>
                        ))}
                        {customThemes.length === 0 && <div className="col-span-full text-center py-6 text-muted-foreground"><Sparkles className="w-6 h-6 mx-auto mb-2 opacity-30" /><p className="text-xs">No custom themes yet</p><p className="text-[10px] mt-1">Click "+ New Theme" above to create one</p></div>}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Blocks Panel */}
          {toolbarPanel === 'blocks' && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                  <button onClick={() => { addBlock('heading'); setToolbarPanel(null); }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all hover:shadow-sm">
                    <Type className="w-5 h-5 text-foreground/70" />
                    <span className="text-[11px] font-medium text-foreground/80">Heading</span>
                  </button>
                  <button onClick={() => { addBlock('text'); setToolbarPanel(null); }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all hover:shadow-sm">
                    <AlignLeft className="w-5 h-5 text-foreground/70" />
                    <span className="text-[11px] font-medium text-foreground/80">Text</span>
                  </button>
                  <button onClick={() => { addBlock('image'); setToolbarPanel(null); }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all hover:shadow-sm">
                    <Image className="w-5 h-5 text-foreground/70" />
                    <span className="text-[11px] font-medium text-foreground/80">Image</span>
                  </button>
                  <button onClick={() => { addBlock('button', 'primary'); setToolbarPanel(null); }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all hover:shadow-sm">
                    <div className="px-2.5 py-1 text-[8px] font-medium rounded-md bg-foreground text-background">Aa</div>
                    <span className="text-[11px] font-medium text-foreground/80">Primary</span>
                  </button>
                  <button onClick={() => { addBlock('button', 'secondary'); setToolbarPanel(null); }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all hover:shadow-sm">
                    <div className="px-2.5 py-1 text-[8px] font-medium rounded-md border-2 border-foreground/60">Aa</div>
                    <span className="text-[11px] font-medium text-foreground/80">Secondary</span>
                  </button>
                  <button onClick={() => { addBlock('link'); setToolbarPanel(null); }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all hover:shadow-sm">
                    <Link className="w-5 h-5 text-foreground/70" />
                    <span className="text-[11px] font-medium text-foreground/80">Link</span>
                  </button>
                  <button onClick={() => { addBlock('divider'); setToolbarPanel(null); }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all hover:shadow-sm">
                    <Minus className="w-5 h-5 text-foreground/70" />
                    <span className="text-[11px] font-medium text-foreground/80">Divider</span>
                  </button>
                  <button onClick={() => { addBlock('spacer'); setToolbarPanel(null); }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all hover:shadow-sm">
                    <Square className="w-5 h-5 text-foreground/70" />
                    <span className="text-[11px] font-medium text-foreground/80">Spacer</span>
                  </button>
                  <button onClick={() => { addBlock('social'); setToolbarPanel(null); }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all hover:shadow-sm">
                    <Share2 className="w-5 h-5 text-foreground/70" />
                    <span className="text-[11px] font-medium text-foreground/80">Social</span>
                  </button>
                  <button 
                    onClick={() => { addBlock('header'); setToolbarPanel(null); }} 
                    disabled={blocks.some(b => b.type === 'header')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                      blocks.some(b => b.type === 'header') 
                        ? "bg-muted/20 opacity-40 cursor-not-allowed" 
                        : "bg-muted/40 hover:bg-muted/70 hover:shadow-sm"
                    )}
                  >
                    <LayoutTemplate className="w-5 h-5 text-foreground/70" />
                    <span className="text-[11px] font-medium text-foreground/80">Header</span>
                  </button>
                  <button 
                    onClick={() => { addBlock('footer'); setToolbarPanel(null); }} 
                    disabled={blocks.some(b => b.type === 'footer')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                      blocks.some(b => b.type === 'footer') 
                        ? "bg-muted/20 opacity-40 cursor-not-allowed" 
                        : "bg-muted/40 hover:bg-muted/70 hover:shadow-sm"
                    )}
                  >
                    <LayoutTemplate className="w-5 h-5 text-foreground/70" />
                    <span className="text-[11px] font-medium text-foreground/80">Footer</span>
                  </button>
                  <button onClick={() => { addBlock('signature'); setToolbarPanel(null); }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all hover:shadow-sm">
                    <PenTool className="w-5 h-5 text-foreground/70" />
                    <span className="text-[11px] font-medium text-foreground/80">Signature</span>
                  </button>
                  <button onClick={() => { addBlock('columns', 'primary'); setToolbarPanel(null); }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all hover:shadow-sm">
                    <Columns2 className="w-5 h-5 text-foreground/70" />
                    <span className="text-[11px] font-medium text-foreground/80">2 Columns</span>
                  </button>
                  <button onClick={() => { addBlock('columns', 'secondary'); setToolbarPanel(null); }} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all hover:shadow-sm">
                    <Columns3 className="w-5 h-5 text-foreground/70" />
                    <span className="text-[11px] font-medium text-foreground/80">3 Columns</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Variables Panel */}
          {toolbarPanel === 'variables' && variables.length > 0 && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                {/* Variables Guide Header */}
                <div className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Variable className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Dynamic Variables Guide</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Variables are placeholders that get replaced with real data when the email is sent. 
                      Click any variable below to insert it at your cursor position in the editor.
                    </p>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search variables by name or description..."
                    value={variableSearchTerm}
                    onChange={(e) => setVariableSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                  {variableSearchTerm && (
                    <button
                      onClick={() => setVariableSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Recommended Variables Section */}
                {(() => {
                  const searchLower = variableSearchTerm.toLowerCase();
                  const recommendedKeys = [
                    'recipient_name',
                    'recipient_first_name',
                    'current_date',
                    'dashboard_link',
                    'company_name',
                  ];
                  const recommendedVars = emailVariables.filter(v => 
                    recommendedKeys.includes(v.variable_key) &&
                    (!variableSearchTerm || 
                      v.variable_key.toLowerCase().includes(searchLower) ||
                      v.description.toLowerCase().includes(searchLower) ||
                      (v.example && v.example.toLowerCase().includes(searchLower))
                    )
                  );
                  
                  if (recommendedVars.length === 0) return null;

                  return (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium font-display uppercase tracking-wide text-muted-foreground">Recommended</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {recommendedVars.map((v) => {
                          const inUse = variables.includes(v.variable_key);
                          return (
                            <button
                              key={v.variable_key}
                              onClick={() => { insertVariable(v.variable_key); setToolbarPanel(null); }}
                              className={cn(
                                "group flex flex-col items-start p-3 rounded-lg hover:bg-amber-500/15 border transition-all text-left relative",
                                inUse 
                                  ? "bg-amber-500/10 border-amber-500/40" 
                                  : "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
                              )}
                            >
                              {inUse && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" title="Used in this template" />
                              )}
                              <code className="text-xs font-mono font-medium text-foreground group-hover:text-amber-600 transition-colors">
                                {`{{${v.variable_key}}}`}
                              </code>
                              <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
                                {v.description}
                              </span>
                              {v.example && (
                                <span className="text-[10px] text-muted-foreground/60 mt-1 italic">
                                  e.g., "{v.example}"
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Categorized Variables */}
                <div className="space-y-4">
                  {(() => {
                    // Filter and group database variables by category
                    const searchLower = variableSearchTerm.toLowerCase();
                    const filteredVariables = emailVariables.filter(v => 
                      !variableSearchTerm || 
                      v.variable_key.toLowerCase().includes(searchLower) ||
                      v.description.toLowerCase().includes(searchLower) ||
                      (v.example && v.example.toLowerCase().includes(searchLower))
                    );
                    
                    const groupedVariables = filteredVariables.reduce((acc, v) => {
                      if (!acc[v.category]) acc[v.category] = [];
                      acc[v.category].push({ 
                        name: v.variable_key, 
                        category: v.category,
                        description: v.description,
                        example: v.example,
                        inUse: variables.includes(v.variable_key) // Track if variable is used in current template
                      });
                      return acc;
                    }, {} as Record<string, Array<{ name: string; category: string; description: string; example: string | null; inUse: boolean }>>);

                    // Category icons and colors
                    const categoryStyles: Record<string, { icon: string; color: string }> = {
                      'Recipient': { icon: '👤', color: 'bg-blue-500/10 text-blue-600' },
                      'Dates': { icon: '🗓️', color: 'bg-teal-500/10 text-teal-600' },
                      'Company': { icon: '🏢', color: 'bg-amber-500/10 text-amber-600' },
                      'Locations': { icon: '📍', color: 'bg-red-500/10 text-red-600' },
                      'Scheduling': { icon: '📆', color: 'bg-cyan-500/10 text-cyan-600' },
                      'Program': { icon: '📈', color: 'bg-green-500/10 text-green-600' },
                      'Metrics': { icon: '📊', color: 'bg-emerald-500/10 text-emerald-600' },
                      'Training': { icon: '📚', color: 'bg-amber-500/10 text-amber-600' },
                      'Notifications': { icon: '🔔', color: 'bg-yellow-500/10 text-yellow-600' },
                      'Birthdays': { icon: '🎂', color: 'bg-pink-500/10 text-pink-600' },
                      'Anniversaries': { icon: '🎉', color: 'bg-violet-500/10 text-violet-600' },
                      'Strikes': { icon: '⚠️', color: 'bg-rose-500/10 text-rose-600' },
                      'Wins': { icon: '🏆', color: 'bg-lime-500/10 text-lime-600' },
                      'Links': { icon: '🔗', color: 'bg-purple-500/10 text-purple-600' },
                      'Custom': { icon: '⚡', color: 'bg-gray-500/10 text-gray-600' },
                    };

                    if (emailVariables.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <Variable className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Loading variables...</p>
                        </div>
                      );
                    }

                    return Object.entries(groupedVariables).map(([category, vars]) => (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">{categoryStyles[category]?.icon || '📦'}</span>
                          <span className="text-xs font-medium font-display uppercase tracking-wide text-muted-foreground">{category}</span>
                          <span className="text-[10px] text-muted-foreground/60">({vars.length})</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {vars.map((v) => (
                            <button
                              key={v.name}
                              onClick={() => { insertVariable(v.name); setToolbarPanel(null); }}
                              className={cn(
                                "group flex flex-col items-start p-3 rounded-lg hover:bg-primary/10 border transition-all text-left relative",
                                v.inUse 
                                  ? "bg-primary/5 border-primary/30" 
                                  : "bg-muted/30 border-transparent hover:border-primary/20"
                              )}
                            >
                              {v.inUse && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" title="Used in this template" />
                              )}
                              <code className="text-xs font-mono font-medium text-foreground group-hover:text-primary transition-colors">
                                {`{{${v.name}}}`}
                              </code>
                              <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
                                {v.description}
                              </span>
                              {v.example && (
                                <span className="text-[10px] text-muted-foreground/60 mt-1 italic">
                                  e.g., "{v.example}"
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Editor Grid */}
          <div className={cn("grid gap-4", selectedBlock ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1")}>
            {/* Properties Panel - Only shown when a block is selected */}
            {selectedBlock && (
              <div className="lg:col-span-1">
                <Card className="mt-4 border-border/50 shadow-sm">
                  <CardContent className="p-3 space-y-3">
                    <div className="font-medium text-xs font-display uppercase tracking-wide text-muted-foreground">{selectedBlock.type} Settings</div>
                    
                    {(selectedBlock.type === 'heading' || selectedBlock.type === 'text') && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Content</Label>
                          <div
                            ref={contentEditableRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={(e) => {
                              const target = e.currentTarget;
                              updateBlock(selectedBlock.id, { content: target.innerHTML });
                            }}
                            onBlur={(e) => {
                              updateBlock(selectedBlock.id, { content: e.currentTarget.innerHTML });
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedBlock.content) }}
                            className="min-h-[180px] text-sm resize-y border rounded-md p-3 bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 overflow-y-auto whitespace-pre-wrap"
                            style={{ maxHeight: '400px' }}
                          />
                          <p className="text-[10px] text-muted-foreground">Tip: Select text and click B for bold or I for italic</p>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1 space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Font Size</Label>
                            <Select
                              value={selectedBlock.styles.fontSize || '16px'}
                              onValueChange={(v) => updateBlockStyles(selectedBlock.id, { fontSize: v })}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fontSizes.map(size => (
                                  <SelectItem key={size} value={size}>{size}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="outline"
                            size={tokens.button.inline}
                            className="h-8 w-8 p-0"
                            onClick={() => applyInlineFormat(selectedBlock.id, 'strong')}
                            title="Bold selected text"
                          >
                            <Bold className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size={tokens.button.inline}
                            className="h-8 w-8 p-0"
                            onClick={() => applyInlineFormat(selectedBlock.id, 'em')}
                            title="Italic selected text"
                          >
                            <Italic className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size={tokens.button.inline}
                            className="h-8 w-8 p-0"
                            onClick={() => applyLinkFormat(selectedBlock.id)}
                            title="Add link to selected text"
                          >
                            <Link className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </>
                    )}

                    {selectedBlock.type === 'button' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-xs">Button Style</Label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateBlockStyles(selectedBlock.id, { buttonVariant: 'primary' })}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all",
                                (!selectedBlock.styles.buttonVariant || selectedBlock.styles.buttonVariant === 'primary')
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border bg-transparent hover:bg-muted/50"
                              )}
                            >
                              Primary
                            </button>
                            <button
                              onClick={() => updateBlockStyles(selectedBlock.id, { buttonVariant: 'secondary' })}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all",
                                selectedBlock.styles.buttonVariant === 'secondary'
                                  ? "border-foreground bg-background text-foreground"
                                  : "border-border bg-transparent hover:bg-muted/50"
                              )}
                            >
                              Secondary
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Button Text</Label>
                          <Input
                            value={selectedBlock.content}
                            onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Link URL</Label>
                          <Input
                            value={selectedBlock.linkUrl || ''}
                            onChange={(e) => updateBlock(selectedBlock.id, { linkUrl: e.target.value })}
                            placeholder="https://... or {{variable}}"
                            className="h-8 text-sm font-mono"
                          />
                        </div>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">
                              {selectedBlock.styles.buttonVariant === 'secondary' ? 'Border/Text Color' : 'Button Color'}
                            </Label>
                            <ColorWheelPicker
                              value={selectedBlock.styles.buttonColor || '#3b82f6'}
                              colorType="primary"
                              onChange={(v) => updateBlockStyles(selectedBlock.id, { buttonColor: v })}
                              themeColors={currentTheme.colors}
                            />
                          </div>
                          {selectedBlock.styles.buttonVariant !== 'secondary' && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Text Color</Label>
                              <ColorWheelPicker
                                value={selectedBlock.styles.buttonTextColor || '#ffffff'}
                                colorType="white"
                                onChange={(v) => updateBlockStyles(selectedBlock.id, { buttonTextColor: v })}
                                themeColors={currentTheme.colors}
                              />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Button Size</Label>
                            <span className="text-xs text-muted-foreground">{selectedBlock.styles.buttonSize || 100}%</span>
                          </div>
                          <Slider
                            variant="filled"
                            min={80}
                            max={140}
                            step={5}
                            value={[selectedBlock.styles.buttonSize || 100]}
                            onValueChange={([value]) => updateBlockStyles(selectedBlock.id, { buttonSize: value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Button Shape</Label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateBlockStyles(selectedBlock.id, { buttonShape: 'pill' })}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-full border-2 text-xs font-medium transition-all",
                                selectedBlock.styles.buttonShape === 'pill'
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border bg-transparent hover:bg-muted/50"
                              )}
                            >
                              Pill
                            </button>
                            <button
                              onClick={() => updateBlockStyles(selectedBlock.id, { buttonShape: 'rounded' })}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all",
                                (!selectedBlock.styles.buttonShape || selectedBlock.styles.buttonShape === 'rounded')
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border bg-transparent hover:bg-muted/50"
                              )}
                            >
                              Rounded
                            </button>
                            <button
                              onClick={() => updateBlockStyles(selectedBlock.id, { buttonShape: 'rectangle' })}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-none border-2 text-xs font-medium transition-all",
                                selectedBlock.styles.buttonShape === 'rectangle'
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border bg-transparent hover:bg-muted/50"
                              )}
                            >
                              Rectangle
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="checkbox"
                            id="button-arrow"
                            checked={selectedBlock.styles.buttonArrow === true}
                            onChange={(e) => updateBlockStyles(selectedBlock.id, { buttonArrow: e.target.checked })}
                            className="h-4 w-4 rounded border-border"
                          />
                          <Label htmlFor="button-arrow" className="text-xs cursor-pointer flex items-center gap-1.5">
                            Show Right Arrow
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Label>
                        </div>
                      </>
                    )}

                    {selectedBlock.type === 'link' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-xs">Link Text</Label>
                          <Input
                            value={selectedBlock.content}
                            onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Link URL</Label>
                          <Input
                            value={selectedBlock.linkUrl || ''}
                            onChange={(e) => updateBlock(selectedBlock.id, { linkUrl: e.target.value })}
                            placeholder="https://... or {{variable}}"
                            className="h-8 text-sm font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Link Color</Label>
                          <ColorWheelPicker
                            value={selectedBlock.styles.buttonColor || '#3b82f6'}
                            colorType="primary"
                            onChange={(v) => updateBlockStyles(selectedBlock.id, { buttonColor: v })}
                            themeColors={currentTheme.colors}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Link Size</Label>
                            <span className="text-xs text-muted-foreground">{selectedBlock.styles.linkSize || 100}%</span>
                          </div>
                          <Slider
                            variant="filled"
                            min={80}
                            max={140}
                            step={5}
                            value={[selectedBlock.styles.linkSize || 100]}
                            onValueChange={([value]) => updateBlockStyles(selectedBlock.id, { linkSize: value })}
                          />
                        </div>
                      </>
                    )}

                    {selectedBlock.type === 'image' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-xs">Custom Image</Label>
                          <div className="flex gap-2">
                            <Input
                              value={selectedBlock.imageUrl || ''}
                              onChange={(e) => updateBlock(selectedBlock.id, { imageUrl: e.target.value })}
                              placeholder="https://..."
                              className="h-8 text-sm flex-1"
                            />
                            <label className="cursor-pointer">
                              <Button variant="outline" size={tokens.button.inline} disabled={isUploading} asChild>
                                <span>
                                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                </span>
                              </Button>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(selectedBlock.id, file);
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Alt Text</Label>
                          <Input
                            value={selectedBlock.content}
                            onChange={(e) => updateBlock(selectedBlock.id, { content: e.target.value })}
                            placeholder="Image description"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Max Width</Label>
                          <Select
                            value={selectedBlock.styles.width || 'auto'}
                            onValueChange={(v) => updateBlockStyles(selectedBlock.id, { width: v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['auto', '100px', '120px', '150px', '180px', '200px', '250px', '300px', '100%'].map(size => (
                                <SelectItem key={size} value={size}>{size}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {selectedBlock.type === 'spacer' && (
                      <div className="space-y-2">
                        <Label className="text-xs">Height</Label>
                        <Select
                          value={selectedBlock.styles.height || '24px'}
                          onValueChange={(v) => updateBlockStyles(selectedBlock.id, { height: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['8px', '16px', '24px', '32px', '48px', '64px'].map(size => (
                              <SelectItem key={size} value={size}>{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedBlock.type === 'social' && (
                      <>
                        <div className="space-y-3">
                          <Label className="text-xs font-medium">Social Platforms</Label>
                          {(['instagram', 'tiktok', 'email'] as const).map((platform) => {
                            const link = (selectedBlock.socialLinks || []).find(l => l.platform === platform);
                            const isEnabled = link?.enabled ?? false;
                            const url = link?.url ?? '';
                            
                            return (
                              <div key={platform} className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={(e) => {
                                      const newLinks = [...(selectedBlock.socialLinks || [])];
                                      const existingIndex = newLinks.findIndex(l => l.platform === platform);
                                      if (existingIndex >= 0) {
                                        newLinks[existingIndex] = { ...newLinks[existingIndex], enabled: e.target.checked };
                                      } else {
                                        newLinks.push({ platform, url: '', enabled: e.target.checked });
                                      }
                                      updateBlock(selectedBlock.id, { socialLinks: newLinks });
                                    }}
                                    className="h-4 w-4 rounded border-border"
                                  />
                                  <div className="flex items-center gap-1.5">
                                    {platform === 'instagram' && <Instagram className="w-4 h-4" />}
                                    {platform === 'tiktok' && (
                                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
                                      </svg>
                                    )}
                                    {platform === 'email' && <Mail className="w-4 h-4" />}
                                    <span className="text-xs capitalize">{platform === 'email' ? 'Email' : platform}</span>
                                  </div>
                                </div>
                                {isEnabled && (
                                  <Input
                                    value={url}
                                    onChange={(e) => {
                                      const newLinks = [...(selectedBlock.socialLinks || [])];
                                      const existingIndex = newLinks.findIndex(l => l.platform === platform);
                                      if (existingIndex >= 0) {
                                        newLinks[existingIndex] = { ...newLinks[existingIndex], url: e.target.value };
                                      } else {
                                        newLinks.push({ platform, url: e.target.value, enabled: true });
                                      }
                                      updateBlock(selectedBlock.id, { socialLinks: newLinks });
                                    }}
                                    placeholder={platform === 'email' ? 'email@example.com' : `https://${platform}.com/...`}
                                    className="h-7 text-xs"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Icon Color</Label>
                          <ColorWheelPicker
                            value={selectedBlock.styles.buttonColor || '#1a1a1a'}
                            colorType="dark"
                            onChange={(v) => updateBlockStyles(selectedBlock.id, { buttonColor: v })}
                            themeColors={currentTheme.colors}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Icon Size</Label>
                            <span className="text-xs text-muted-foreground">{selectedBlock.styles.iconSize || 24}px</span>
                          </div>
                          <Slider
                            variant="filled"
                            min={16}
                            max={48}
                            step={2}
                            value={[selectedBlock.styles.iconSize || 24]}
                            onValueChange={([value]) => updateBlockStyles(selectedBlock.id, { iconSize: value })}
                          />
                        </div>
                      </>
                    )}

                    {selectedBlock.type === 'footer' && (() => {
                      // Ensure footerConfig always has proper defaults
                      const defaultConfig = { 
                        showLogo: true, 
                        logoId: 'brand-primary-white', 
                        logoSize: 'large' as const, 
                        logoPosition: 'center' as const, 
                        showSocialIcons: true, 
                        copyrightText: '© 2026 All rights reserved.' 
                      };
                      const footerConfig = { ...defaultConfig, ...selectedBlock.footerConfig };
                      
                      return (
                      <>
                        <div className="space-y-3">
                          <Label className="text-xs font-medium">Footer Options</Label>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={footerConfig.showLogo}
                                onChange={(e) => {
                                  updateBlock(selectedBlock.id, {
                                    footerConfig: {
                                      ...footerConfig,
                                      showLogo: e.target.checked,
                                    }
                                  });
                                }}
                                className="h-4 w-4 rounded border-border"
                              />
                              <span className="text-xs">Show Logo</span>
                            </div>
                            {footerConfig.showLogo && (
                              <div className="space-y-2">
                                <Select
                                  value={footerConfig.logoId}
                                  onValueChange={(v) => {
                                    updateBlock(selectedBlock.id, {
                                      footerConfig: {
                                        ...footerConfig,
                                        logoId: v,
                                      }
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {brandLogos.map((logo) => (
                                      <SelectItem key={logo.id} value={logo.id}>
                                        {logo.name} ({logo.variant === 'black' ? 'Black' : 'White'})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Size</span>
                                  <Select
                                    value={footerConfig.logoSize}
                                    onValueChange={(v) => {
                                      updateBlock(selectedBlock.id, {
                                        footerConfig: {
                                          ...footerConfig,
                                          logoSize: v as 'xs' | 'small' | 'medium' | 'large' | 'xl',
                                        }
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs flex-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="xs">Extra Small (50px)</SelectItem>
                                      <SelectItem value="small">Small (80px)</SelectItem>
                                      <SelectItem value="medium">Medium (120px)</SelectItem>
                                      <SelectItem value="large">Large (160px)</SelectItem>
                                      <SelectItem value="xl">Extra Large (220px)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Position</span>
                                  <div className="flex gap-1 flex-1">
                                    {(['left', 'center', 'right'] as const).map((pos) => (
                                      <Button
                                        key={pos}
                                        type="button"
                                        variant={footerConfig.logoPosition === pos ? 'default' : 'outline'}
                                        size={tokens.button.inline}
                                        className="flex-1 h-7 text-xs capitalize"
                                        onClick={() => {
                                          updateBlock(selectedBlock.id, {
                                            footerConfig: {
                                              ...footerConfig,
                                              logoPosition: pos,
                                            }
                                          });
                                        }}
                                      >
                                        {pos}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={footerConfig.showSocialIcons}
                              onChange={(e) => {
                                updateBlock(selectedBlock.id, {
                                  footerConfig: {
                                    ...footerConfig,
                                    showSocialIcons: e.target.checked,
                                  }
                                });
                              }}
                              className="h-4 w-4 rounded border-border"
                            />
                            <span className="text-xs">Show Social Icons</span>
                          </div>
                        </div>

                        {footerConfig.showSocialIcons && (
                          <div className="space-y-3">
                            <Label className="text-xs font-medium">Social Platforms</Label>
                            {(['instagram', 'tiktok', 'email'] as const).map((platform) => {
                              const link = (selectedBlock.socialLinks || []).find(l => l.platform === platform);
                              const isEnabled = link?.enabled ?? false;
                              const url = link?.url ?? '';
                              
                              return (
                                <div key={platform} className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isEnabled}
                                      onChange={(e) => {
                                        const newLinks = [...(selectedBlock.socialLinks || [])];
                                        const existingIndex = newLinks.findIndex(l => l.platform === platform);
                                        if (existingIndex >= 0) {
                                          newLinks[existingIndex] = { ...newLinks[existingIndex], enabled: e.target.checked };
                                        } else {
                                          newLinks.push({ platform, url: '', enabled: e.target.checked });
                                        }
                                        updateBlock(selectedBlock.id, { socialLinks: newLinks });
                                      }}
                                      className="h-4 w-4 rounded border-border"
                                    />
                                    <div className="flex items-center gap-1.5">
                                      {platform === 'instagram' && <Instagram className="w-4 h-4" />}
                                      {platform === 'tiktok' && (
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
                                        </svg>
                                      )}
                                      {platform === 'email' && <Mail className="w-4 h-4" />}
                                      <span className="text-xs capitalize">{platform === 'email' ? 'Email' : platform}</span>
                                    </div>
                                  </div>
                                  {isEnabled && (
                                    <Input
                                      value={url}
                                      onChange={(e) => {
                                        const newLinks = [...(selectedBlock.socialLinks || [])];
                                        const existingIndex = newLinks.findIndex(l => l.platform === platform);
                                        if (existingIndex >= 0) {
                                          newLinks[existingIndex] = { ...newLinks[existingIndex], url: e.target.value };
                                        } else {
                                          newLinks.push({ platform, url: e.target.value, enabled: true });
                                        }
                                        updateBlock(selectedBlock.id, { socialLinks: newLinks });
                                      }}
                                      placeholder={platform === 'email' ? 'email@example.com' : `https://${platform}.com/...`}
                                      className="h-7 text-xs"
                                    />
                                  )}
                                </div>
                              );
                            })}
                            <div className="flex items-center gap-3 pt-2">
                              <Label className="text-xs whitespace-nowrap">Icon Color</Label>
                              <ColorWheelPicker
                                value={selectedBlock.styles.buttonColor || '#f5f0e8'}
                                colorType="light"
                                onChange={(v) => updateBlockStyles(selectedBlock.id, { buttonColor: v })}
                                themeColors={currentTheme.colors}
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-xs">Copyright Text</Label>
                          <Input
                            value={footerConfig.copyrightText}
                            onChange={(e) => {
                              updateBlock(selectedBlock.id, {
                                footerConfig: {
                                  ...footerConfig,
                                  copyrightText: e.target.value,
                                }
                              });
                            }}
                            placeholder="© 2025 Company Name"
                            className="h-8 text-sm"
                          />
                        </div>
                      </>
                    );
                    })()}

                    {selectedBlock.type === 'header' && (
                      <>
                        <div className="space-y-3">
                          <Label className="text-xs font-medium">Header Options</Label>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedBlock.headerConfig?.showLogo ?? true}
                                onChange={(e) => {
                                  updateBlock(selectedBlock.id, {
                                    headerConfig: {
                                      ...selectedBlock.headerConfig!,
                                      showLogo: e.target.checked,
                                    }
                                  });
                                }}
                                className="h-4 w-4 rounded border-border"
                              />
                              <span className="text-xs">Show Logo</span>
                            </div>
                            {selectedBlock.headerConfig?.showLogo && (
                              <div className="space-y-2">
                                <Select
                                  value={selectedBlock.headerConfig?.logoId || 'brand-primary-black'}
                                  onValueChange={(v) => {
                                    updateBlock(selectedBlock.id, {
                                      headerConfig: {
                                        ...selectedBlock.headerConfig!,
                                        logoId: v,
                                      }
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {brandLogos.map((logo) => (
                                      <SelectItem key={logo.id} value={logo.id}>
                                        {logo.name} ({logo.variant === 'black' ? 'Black' : 'White'})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Size</span>
                                  <Select
                                    value={selectedBlock.headerConfig?.logoSize || 'medium'}
                                    onValueChange={(v) => {
                                      updateBlock(selectedBlock.id, {
                                        headerConfig: {
                                          ...selectedBlock.headerConfig!,
                                          logoSize: v as 'xs' | 'small' | 'medium' | 'large' | 'xl',
                                        }
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs flex-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="xs">Extra Small (50px)</SelectItem>
                                      <SelectItem value="small">Small (80px)</SelectItem>
                                      <SelectItem value="medium">Medium (120px)</SelectItem>
                                      <SelectItem value="large">Large (160px)</SelectItem>
                                      <SelectItem value="xl">Extra Large (220px)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Position</span>
                                  <div className="flex gap-1 flex-1">
                                    {(['left', 'center', 'right'] as const).map((pos) => (
                                      <Button
                                        key={pos}
                                        type="button"
                                        variant={selectedBlock.headerConfig?.logoPosition === pos || (!selectedBlock.headerConfig?.logoPosition && pos === 'left') ? 'default' : 'outline'}
                                        size={tokens.button.inline}
                                        className="flex-1 h-7 text-xs capitalize"
                                        onClick={() => {
                                          updateBlock(selectedBlock.id, {
                                            headerConfig: {
                                              ...selectedBlock.headerConfig!,
                                              logoPosition: pos,
                                            }
                                          });
                                        }}
                                      >
                                        {pos}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedBlock.headerConfig?.showNavLinks ?? true}
                                onChange={(e) => {
                                  updateBlock(selectedBlock.id, {
                                    headerConfig: {
                                      ...selectedBlock.headerConfig!,
                                      showNavLinks: e.target.checked,
                                    }
                                  });
                                }}
                                className="h-4 w-4 rounded border-border"
                              />
                              <span className="text-xs">Show Navigation Links</span>
                            </div>
                            {selectedBlock.headerConfig?.showNavLinks && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Alignment</span>
                                <div className="flex gap-1 flex-1">
                                  {(['left', 'center', 'right'] as const).map((pos) => (
                                    <Button
                                      key={pos}
                                      type="button"
                                      variant={selectedBlock.headerConfig?.navLinksPosition === pos || (!selectedBlock.headerConfig?.navLinksPosition && pos === 'right') ? 'default' : 'outline'}
                                      size={tokens.button.inline}
                                      className="flex-1 h-7 text-xs capitalize"
                                      onClick={() => {
                                        updateBlock(selectedBlock.id, {
                                          headerConfig: {
                                            ...selectedBlock.headerConfig!,
                                            navLinksPosition: pos,
                                          }
                                        });
                                      }}
                                    >
                                      {pos}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedBlock.headerConfig?.showNavLinks && (
                          <div className="space-y-3">
                            <Label className="text-xs font-medium">Navigation Links</Label>
                            {(selectedBlock.navLinks || []).map((link, index) => (
                              <div key={index} className="space-y-1.5 p-2 border rounded-md bg-muted/30">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={link.enabled}
                                    onChange={(e) => {
                                      const newLinks = [...(selectedBlock.navLinks || [])];
                                      newLinks[index] = { ...newLinks[index], enabled: e.target.checked };
                                      updateBlock(selectedBlock.id, { navLinks: newLinks });
                                    }}
                                    className="h-4 w-4 rounded border-border"
                                  />
                                  <Input
                                    value={link.label}
                                    onChange={(e) => {
                                      const newLinks = [...(selectedBlock.navLinks || [])];
                                      newLinks[index] = { ...newLinks[index], label: e.target.value };
                                      updateBlock(selectedBlock.id, { navLinks: newLinks });
                                    }}
                                    placeholder="Link label"
                                    className="h-7 text-xs flex-1"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => {
                                      const newLinks = (selectedBlock.navLinks || []).filter((_, i) => i !== index);
                                      updateBlock(selectedBlock.id, { navLinks: newLinks });
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                {link.enabled && (
                                  <>
                                    <Input
                                      value={link.url}
                                      onChange={(e) => {
                                        const newLinks = [...(selectedBlock.navLinks || [])];
                                        newLinks[index] = { ...newLinks[index], url: e.target.value };
                                        updateBlock(selectedBlock.id, { navLinks: newLinks });
                                      }}
                                      placeholder="https://..."
                                      className="h-7 text-xs"
                                    />
                                    <div className="flex items-center gap-2 pt-1">
                                      <input
                                        type="checkbox"
                                        checked={link.showArrow ?? false}
                                        onChange={(e) => {
                                          const newLinks = [...(selectedBlock.navLinks || [])];
                                          newLinks[index] = { ...newLinks[index], showArrow: e.target.checked };
                                          updateBlock(selectedBlock.id, { navLinks: newLinks });
                                        }}
                                        className="h-3.5 w-3.5 rounded border-border"
                                      />
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        Show Arrow <ArrowRight className="w-3 h-3" />
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size={tokens.button.inline}
                              className="w-full"
                              onClick={() => {
                                const newLinks = [...(selectedBlock.navLinks || []), { label: 'New Link', url: '#', enabled: true }];
                                updateBlock(selectedBlock.id, { navLinks: newLinks });
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Link
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    {selectedBlock.type === 'signature' && (() => {
                      const config = selectedBlock.signatureConfig || { name: 'Your Name', title: 'Your Title', imageUrl: '', layout: 'horizontal-left', imageSize: 80, indent: 0, showPhone: false, phone: '', showEmail: false, email: '' };
                      
                      return (
                        <>
                          {/* Preset Actions */}
                          <SignaturePresetActions 
                            config={config as SignatureConfig}
                            onLoadPreset={(presetConfig) => {
                              updateBlock(selectedBlock.id, {
                                signatureConfig: { ...config, ...presetConfig }
                              });
                            }}
                          />
                          
                          <div className="space-y-3">
                            <Label className="text-xs font-medium">Signature Details</Label>
                            <div className="space-y-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Name</Label>
                                <Input
                                  value={config.name}
                                  onChange={(e) => {
                                    updateBlock(selectedBlock.id, {
                                      signatureConfig: { ...config, name: e.target.value }
                                    });
                                  }}
                                  placeholder="Your Name"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Title / Role</Label>
                                <Input
                                  value={config.title}
                                  onChange={(e) => {
                                    updateBlock(selectedBlock.id, {
                                      signatureConfig: { ...config, title: e.target.value }
                                    });
                                  }}
                                  placeholder="Your Title"
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Contact Info Options */}
                          <div className="space-y-3">
                            <Label className="text-xs font-medium">Contact Information</Label>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={config.showPhone || false}
                                  onChange={(e) => {
                                    updateBlock(selectedBlock.id, {
                                      signatureConfig: { ...config, showPhone: e.target.checked }
                                    });
                                  }}
                                  className="h-4 w-4 rounded border-border"
                                />
                                <span className="text-xs">Show Phone Number</span>
                              </div>
                              {config.showPhone && (
                                <Input
                                  value={config.phone || ''}
                                  onChange={(e) => {
                                    updateBlock(selectedBlock.id, {
                                      signatureConfig: { ...config, phone: e.target.value }
                                    });
                                  }}
                                  placeholder="(555) 123-4567"
                                  className="h-8 text-sm"
                                />
                              )}
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={config.showEmail || false}
                                  onChange={(e) => {
                                    updateBlock(selectedBlock.id, {
                                      signatureConfig: { ...config, showEmail: e.target.checked }
                                    });
                                  }}
                                  className="h-4 w-4 rounded border-border"
                                />
                                <span className="text-xs">Show Email</span>
                              </div>
                              {config.showEmail && (
                                <Input
                                  value={config.email || ''}
                                  onChange={(e) => {
                                    updateBlock(selectedBlock.id, {
                                      signatureConfig: { ...config, email: e.target.value }
                                    });
                                  }}
                                  placeholder="email@example.com"
                                  className="h-8 text-sm"
                                />
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <Label className="text-xs font-medium">Signature Image</Label>
                            {/* Image Preview - improved UI */}
                            <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                              <div className="flex items-center gap-4">
                                {config.imageUrl ? (
                                  <div className="relative group">
                                    <img 
                                      src={config.imageUrl} 
                                      alt="Signature"
                                      className="rounded-full object-cover shadow-sm"
                                      style={{ 
                                        width: `${Math.min(config.imageSize || 80, 80)}px`, 
                                        height: `${Math.min(config.imageSize || 80, 80)}px` 
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-foreground/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Trash2 
                                        className="w-5 h-5 text-background cursor-pointer"
                                        onClick={() => {
                                          updateBlock(selectedBlock.id, {
                                            signatureConfig: { ...config, imageUrl: '' }
                                          });
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    className="rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border"
                                    style={{ 
                                      width: `${Math.min(config.imageSize || 80, 80)}px`, 
                                      height: `${Math.min(config.imageSize || 80, 80)}px` 
                                    }}
                                  >
                                    <PenTool className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <label className="cursor-pointer">
                                    <Button variant="outline" size={tokens.button.inline} className="w-full text-xs h-9" asChild>
                                      <span>
                                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                                        {isUploading ? 'Uploading...' : 'Upload Photo'}
                                      </span>
                                    </Button>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleSignatureFileSelect(selectedBlock.id, file);
                                        }
                                        e.target.value = '';
                                      }}
                                      disabled={isUploading}
                                    />
                                  </label>
                                  {config.imageUrl && (
                                    <Button 
                                      variant="ghost" 
                                      size={tokens.button.inline} 
                                      className="w-full text-xs text-destructive hover:text-destructive mt-1"
                                      onClick={() => {
                                        updateBlock(selectedBlock.id, {
                                          signatureConfig: { ...config, imageUrl: '' }
                                        });
                                      }}
                                    >
                                      Remove Image
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Image Size Slider */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground">Image Size</Label>
                                <span className="text-xs text-muted-foreground font-mono">{config.imageSize || 80}px</span>
                              </div>
                              <Slider
                                variant="filled"
                                min={40}
                                max={120}
                                step={4}
                                value={[config.imageSize || 80]}
                                onValueChange={([value]) => {
                                  updateBlock(selectedBlock.id, {
                                    signatureConfig: { ...config, imageSize: value }
                                  });
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Layout</Label>
                            <div className="grid grid-cols-3 gap-2">
                              {([
                                { value: 'horizontal-left', label: 'Image Left' },
                                { value: 'horizontal-right', label: 'Image Right' },
                                { value: 'stacked', label: 'Stacked' },
                              ] as const).map((option) => (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={config.layout === option.value ? 'default' : 'outline'}
                                  size={tokens.button.inline}
                                  className="h-8 text-[10px]"
                                  onClick={() => {
                                    updateBlock(selectedBlock.id, {
                                      signatureConfig: { ...config, layout: option.value }
                                    });
                                  }}
                                >
                                  {option.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Indent Slider */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">Indent</Label>
                              <span className="text-xs text-muted-foreground font-mono">{config.indent || 0}px</span>
                            </div>
                            <Slider
                              variant="filled"
                              min={0}
                              max={60}
                              step={4}
                              value={[config.indent || 0]}
                              onValueChange={([value]) => {
                                updateBlock(selectedBlock.id, {
                                  signatureConfig: { ...config, indent: value }
                                });
                              }}
                            />
                          </div>
                        </>
                      );
                    })()}


                    {/* Columns Controls */}
                    {selectedBlock.type === 'columns' && (() => {
                      const config = selectedBlock.columnsConfig || { columnCount: 2, columns: [], columnBlocks: [[], []], gap: 16 };
                      const columnBlocks = config.columnBlocks || [[], []];
                      
                      const updateColumnBlock = (colIndex: number, blockIndex: number, updates: Partial<EmailBlock>) => {
                        const newColumnBlocks = columnBlocks.map((col, i) => 
                          i === colIndex 
                            ? col.map((blk, j) => j === blockIndex ? { ...blk, ...updates } : blk)
                            : [...col]
                        );
                        updateBlock(selectedBlock.id, { columnsConfig: { ...config, columnBlocks: newColumnBlocks } });
                      };
                      
                      const addColumnBlock = (colIndex: number, type: ColumnBlockType) => {
                        const currentTheme = allThemes.find(t => t.id === selectedTheme) || emailThemes[0];
                        const newBlock: EmailBlock = {
                          id: crypto.randomUUID(),
                          type,
                          content: type === 'heading' ? 'Heading' : type === 'text' ? 'Text content' : type === 'button' ? 'Button' : type === 'link' ? 'Click here' : '',
                          styles: {
                            textAlign: 'center',
                            fontSize: type === 'heading' ? '18px' : '14px',
                            padding: '8px',
                            ...(type === 'heading' && { 
                              backgroundColor: currentTheme.colors.headerBg, 
                              textColor: currentTheme.colors.headerText 
                            }),
                            ...(type === 'text' && { 
                              backgroundColor: 'transparent', 
                              textColor: currentTheme.colors.bodyText 
                            }),
                            ...(type === 'button' && { 
                              buttonColor: currentTheme.colors.buttonBg, 
                              buttonTextColor: currentTheme.colors.buttonText,
                              buttonVariant: 'primary' as const
                            }),
                            ...(type === 'link' && { 
                              buttonColor: currentTheme.colors.buttonBg
                            }),
                            ...(type === 'divider' && { 
                              textColor: currentTheme.colors.dividerColor 
                            }),
                            ...(type === 'spacer' && { height: '16px' }),
                            ...(type === 'social' && { 
                              buttonColor: currentTheme.colors.buttonBg
                            }),
                          },
                          ...(type === 'button' && { linkUrl: '{{dashboard_url}}' }),
                          ...(type === 'link' && { linkUrl: '{{dashboard_url}}' }),
                          ...(type === 'social' && { 
                            socialLinks: [
                              { platform: 'instagram' as const, url: '', enabled: false },
                              { platform: 'email' as const, url: '', enabled: false },
                            ]
                          }),
                        };
                        const newColumnBlocks = columnBlocks.map((col, i) => 
                          i === colIndex ? [...col, newBlock] : [...col]
                        );
                        // Ensure we have enough columns
                        while (newColumnBlocks.length < config.columnCount) {
                          newColumnBlocks.push([]);
                        }
                        updateBlock(selectedBlock.id, { columnsConfig: { ...config, columnBlocks: newColumnBlocks } });
                      };
                      
                      const removeColumnBlock = (colIndex: number, blockIndex: number) => {
                        const newColumnBlocks = columnBlocks.map((col, i) => 
                          i === colIndex ? col.filter((_, j) => j !== blockIndex) : [...col]
                        );
                        updateBlock(selectedBlock.id, { columnsConfig: { ...config, columnBlocks: newColumnBlocks } });
                      };
                      
                      return (
                        <>
                          <div className="space-y-3">
                            <Label className="text-xs font-medium">Column Layout</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={config.columnCount === 2 ? 'default' : 'outline'}
                                size={tokens.button.inline}
                                className="flex-1 h-8"
                                onClick={() => {
                                  const newColumnBlocks = columnBlocks.slice(0, 2);
                                  while (newColumnBlocks.length < 2) newColumnBlocks.push([]);
                                  updateBlock(selectedBlock.id, { 
                                    columnsConfig: { ...config, columnCount: 2, columnBlocks: newColumnBlocks } 
                                  });
                                }}
                              >
                                <Columns2 className="w-4 h-4 mr-1" />
                                2 Columns
                              </Button>
                              <Button
                                type="button"
                                variant={config.columnCount === 3 ? 'default' : 'outline'}
                                size={tokens.button.inline}
                                className="flex-1 h-8"
                                onClick={() => {
                                  const newColumnBlocks = [...columnBlocks];
                                  while (newColumnBlocks.length < 3) newColumnBlocks.push([]);
                                  updateBlock(selectedBlock.id, { 
                                    columnsConfig: { ...config, columnCount: 3, columnBlocks: newColumnBlocks } 
                                  });
                                }}
                              >
                                <Columns3 className="w-4 h-4 mr-1" />
                                3 Columns
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Column Gap</Label>
                              <span className="text-xs text-muted-foreground">{config.gap || 16}px</span>
                            </div>
                            <Slider
                              variant="filled"
                              min={0}
                              max={32}
                              step={4}
                              value={[config.gap || 16]}
                              onValueChange={([value]) => {
                                updateBlock(selectedBlock.id, { columnsConfig: { ...config, gap: value } });
                              }}
                            />
                          </div>
                          
                          <div className="space-y-3 pt-2 border-t">
                            <Label className="text-xs font-medium flex items-center gap-2">
                              Column Blocks
                              <span className="text-[10px] font-normal text-muted-foreground">(add any block type)</span>
                            </Label>
                            {columnBlocks.slice(0, config.columnCount).map((colBlocks, colIndex) => (
                              <div key={colIndex} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-medium text-muted-foreground">Column {colIndex + 1}</span>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" size={tokens.button.inline} className="h-6 text-[10px] px-2">
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Block
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-48 p-2" align="end">
                                      <div className="grid grid-cols-2 gap-1">
                                        <button 
                                          onClick={() => addColumnBlock(colIndex, 'heading')}
                                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded hover:bg-muted"
                                        >
                                          <Type className="w-3 h-3" />
                                          Heading
                                        </button>
                                        <button 
                                          onClick={() => addColumnBlock(colIndex, 'text')}
                                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded hover:bg-muted"
                                        >
                                          <AlignLeft className="w-3 h-3" />
                                          Text
                                        </button>
                                        <button 
                                          onClick={() => addColumnBlock(colIndex, 'button')}
                                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded hover:bg-muted"
                                        >
                                          <MousePointerClick className="w-3 h-3" />
                                          Button
                                        </button>
                                        <button 
                                          onClick={() => addColumnBlock(colIndex, 'link')}
                                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded hover:bg-muted"
                                        >
                                          <Link className="w-3 h-3" />
                                          Link
                                        </button>
                                        <button 
                                          onClick={() => addColumnBlock(colIndex, 'image')}
                                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded hover:bg-muted"
                                        >
                                          <Image className="w-3 h-3" />
                                          Image
                                        </button>
                                        <button 
                                          onClick={() => addColumnBlock(colIndex, 'divider')}
                                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded hover:bg-muted"
                                        >
                                          <Minus className="w-3 h-3" />
                                          Divider
                                        </button>
                                        <button 
                                          onClick={() => addColumnBlock(colIndex, 'spacer')}
                                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded hover:bg-muted"
                                        >
                                          <Square className="w-3 h-3" />
                                          Spacer
                                        </button>
                                        <button 
                                          onClick={() => addColumnBlock(colIndex, 'social')}
                                          className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded hover:bg-muted"
                                        >
                                          <Share2 className="w-3 h-3" />
                                          Social
                                        </button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                
                                <div 
                                                  className="space-y-1"
                                                  data-column-block-drop-zone
                                                  onDragLeave={handleColumnBlockDragLeave}
                                                >
                                                  {colBlocks.map((colBlock, blockIndex) => (
                                                    <div key={colBlock.id}>
                                                      {/* Drop zone above each block */}
                                                      <div 
                                                        className={cn(
                                                          "h-1 -my-0.5 transition-all rounded",
                                                          dropTargetColumnBlock?.parentBlockId === selectedBlock.id &&
                                                          dropTargetColumnBlock?.colIndex === colIndex &&
                                                          dropTargetColumnBlock?.blockIndex === blockIndex
                                                            ? "bg-primary h-2"
                                                            : "bg-transparent"
                                                        )}
                                                        onDragOver={(e) => handleColumnBlockDragOver(e, selectedBlock.id, colIndex, blockIndex)}
                                                        onDrop={(e) => handleColumnBlockDrop(e, selectedBlock.id, colIndex, blockIndex)}
                                                      />
                                                      <div 
                                                        draggable
                                                        onDragStart={(e) => handleColumnBlockDragStart(e, selectedBlock.id, colIndex, blockIndex, colBlock)}
                                                        onDragEnd={handleColumnBlockDragEnd}
                                                        className={cn(
                                                          "bg-muted/40 rounded-lg p-2 space-y-2 transition-all",
                                                          draggedColumnBlock?.block.id === colBlock.id && "opacity-50 scale-[0.98]"
                                                        )}
                                                      >
                                                        <div className="flex items-center justify-between">
                                                          <div className="flex items-center gap-1 cursor-grab active:cursor-grabbing">
                                                            <GripVertical className="w-3 h-3 text-muted-foreground" />
                                                            <span className="text-[10px] font-medium capitalize text-muted-foreground">{colBlock.type}</span>
                                                          </div>
                                                          <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-5 w-5 text-destructive hover:text-destructive"
                                                            onClick={() => removeColumnBlock(colIndex, blockIndex)}
                                                          >
                                                            <Trash2 className="w-3 h-3" />
                                                          </Button>
                                                        </div>
                                      
                                      {/* Block-specific editors */}
                                      {(colBlock.type === 'heading' || colBlock.type === 'text') && (
                                        <Textarea
                                          value={colBlock.content}
                                          onChange={(e) => updateColumnBlock(colIndex, blockIndex, { content: e.target.value })}
                                          placeholder={colBlock.type === 'heading' ? 'Heading...' : 'Text content...'}
                                          className="min-h-[60px] text-xs resize-y"
                                        />
                                      )}
                                      
                                      {colBlock.type === 'button' && (
                                        <>
                                          <Input
                                            value={colBlock.content}
                                            onChange={(e) => updateColumnBlock(colIndex, blockIndex, { content: e.target.value })}
                                            placeholder="Button text..."
                                            className="h-7 text-xs"
                                          />
                                          <Input
                                            value={colBlock.linkUrl || ''}
                                            onChange={(e) => updateColumnBlock(colIndex, blockIndex, { linkUrl: e.target.value })}
                                            placeholder="Button URL..."
                                            className="h-7 text-xs"
                                          />
                                          <div className="flex gap-1">
                                            <Button
                                              type="button"
                                              variant={colBlock.styles.buttonVariant !== 'secondary' ? 'default' : 'outline'}
                                              size={tokens.button.inline}
                                              className="flex-1 h-6 text-[10px]"
                                              onClick={() => updateColumnBlock(colIndex, blockIndex, { 
                                                styles: { ...colBlock.styles, buttonVariant: 'primary' } 
                                              })}
                                            >
                                              Primary
                                            </Button>
                                            <Button
                                              type="button"
                                              variant={colBlock.styles.buttonVariant === 'secondary' ? 'default' : 'outline'}
                                              size={tokens.button.inline}
                                              className="flex-1 h-6 text-[10px]"
                                              onClick={() => updateColumnBlock(colIndex, blockIndex, { 
                                                styles: { ...colBlock.styles, buttonVariant: 'secondary' } 
                                              })}
                                            >
                                              Secondary
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                      
                                      {colBlock.type === 'link' && (
                                        <>
                                          <Input
                                            value={colBlock.content}
                                            onChange={(e) => updateColumnBlock(colIndex, blockIndex, { content: e.target.value })}
                                            placeholder="Link text..."
                                            className="h-7 text-xs"
                                          />
                                          <Input
                                            value={colBlock.linkUrl || ''}
                                            onChange={(e) => updateColumnBlock(colIndex, blockIndex, { linkUrl: e.target.value })}
                                            placeholder="URL..."
                                            className="h-7 text-xs"
                                          />
                                        </>
                                      )}
                                      
                                      {colBlock.type === 'image' && (
                                        <div className="space-y-2">
                                          <Input
                                            value={colBlock.imageUrl || ''}
                                            onChange={(e) => updateColumnBlock(colIndex, blockIndex, { imageUrl: e.target.value })}
                                            placeholder="Image URL..."
                                            className="h-7 text-xs"
                                          />
                                          <Input
                                            value={colBlock.content || ''}
                                            onChange={(e) => updateColumnBlock(colIndex, blockIndex, { content: e.target.value })}
                                            placeholder="Alt text..."
                                            className="h-7 text-xs"
                                          />
                                        </div>
                                      )}
                                      
                                      {colBlock.type === 'spacer' && (
                                        <Select
                                          value={colBlock.styles.height || '16px'}
                                          onValueChange={(v) => updateColumnBlock(colIndex, blockIndex, { 
                                            styles: { ...colBlock.styles, height: v } 
                                          })}
                                        >
                                          <SelectTrigger className="h-7 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {['8px', '12px', '16px', '24px', '32px', '48px'].map(size => (
                                              <SelectItem key={size} value={size}>{size}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                      
                                      {colBlock.type === 'divider' && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-muted-foreground">Width:</span>
                                          <Slider
                                            variant="filled"
                                            min={20}
                                            max={100}
                                            step={10}
                                            value={[colBlock.styles.dividerWidth || 100]}
                                            onValueChange={([v]) => updateColumnBlock(colIndex, blockIndex, { 
                                              styles: { ...colBlock.styles, dividerWidth: v } 
                                            })}
                                            className="flex-1"
                                          />
                                          <span className="text-[10px] text-muted-foreground w-8">{colBlock.styles.dividerWidth || 100}%</span>
                                        </div>
                                      )}
                                      
                                      {/* Alignment control for all content blocks */}
                                      {['heading', 'text', 'button', 'link', 'image'].includes(colBlock.type) && (
                                        <div className="flex gap-1 pt-1 border-t border-border/50">
                                          {(['left', 'center', 'right'] as const).map(align => (
                                            <Button
                                              key={align}
                                              variant={colBlock.styles.textAlign === align ? 'default' : 'ghost'}
                                              size={tokens.button.inline}
                                              className="h-6 w-6 p-0"
                                              onClick={() => updateColumnBlock(colIndex, blockIndex, { 
                                                styles: { ...colBlock.styles, textAlign: align } 
                                              })}
                                            >
                                              {align === 'left' && <AlignLeft className="w-3 h-3" />}
                                              {align === 'center' && <AlignCenter className="w-3 h-3" />}
                                              {align === 'right' && <AlignRight className="w-3 h-3" />}
                                            </Button>
                                          ))}
                                        </div>
                                      )}
                                      </div>
                                    </div>
                                  ))}
                                  {/* Drop zone at end of column */}
                                  <div 
                                    className={cn(
                                      "h-2 transition-all rounded mt-1",
                                      dropTargetColumnBlock?.parentBlockId === selectedBlock.id &&
                                      dropTargetColumnBlock?.colIndex === colIndex &&
                                      dropTargetColumnBlock?.blockIndex === null
                                        ? "bg-primary"
                                        : "bg-transparent"
                                    )}
                                    onDragOver={(e) => handleColumnBlockDragOver(e, selectedBlock.id, colIndex, null)}
                                    onDrop={(e) => handleColumnBlockDrop(e, selectedBlock.id, colIndex, null)}
                                  />
                                </div>
                                
                                {colBlocks.length === 0 && (
                                  <div 
                                    className={cn(
                                      "text-[10px] text-muted-foreground italic py-3 text-center border border-dashed rounded transition-colors",
                                      dropTargetColumnBlock?.parentBlockId === selectedBlock.id &&
                                      dropTargetColumnBlock?.colIndex === colIndex
                                        ? "border-primary bg-primary/5"
                                        : ""
                                    )}
                                    data-column-block-drop-zone
                                    onDragOver={(e) => handleColumnBlockDragOver(e, selectedBlock.id, colIndex, null)}
                                    onDragLeave={handleColumnBlockDragLeave}
                                    onDrop={(e) => handleColumnBlockDrop(e, selectedBlock.id, colIndex, null)}
                                  >
                                    {draggedColumnBlock ? "Drop here" : "No blocks yet - click \"Add Block\" above"}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}

                    {/* Divider Controls */}
                    {selectedBlock.type === 'divider' && (
                      <div className="space-y-3">
                        <Label className="text-xs font-medium">Divider Settings</Label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Thickness</Label>
                            <span className="text-xs text-muted-foreground">{selectedBlock.styles.dividerThickness || 1}px</span>
                          </div>
                          <Slider
                            variant="filled"
                            min={1}
                            max={8}
                            step={1}
                            value={[selectedBlock.styles.dividerThickness || 1]}
                            onValueChange={([value]) => updateBlockStyles(selectedBlock.id, { dividerThickness: value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Width</Label>
                            <span className="text-xs text-muted-foreground">{selectedBlock.styles.dividerWidth || 100}%</span>
                          </div>
                          <Slider
                            variant="filled"
                            min={20}
                            max={100}
                            step={5}
                            value={[selectedBlock.styles.dividerWidth || 100]}
                            onValueChange={([value]) => updateBlockStyles(selectedBlock.id, { dividerWidth: value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Style</Label>
                          <div className="flex gap-1">
                            {(['solid', 'dashed', 'dotted', 'double'] as const).map(style => (
                              <Button
                                key={style}
                                variant={(selectedBlock.styles.dividerStyle || 'solid') === style ? 'default' : 'outline'}
                                size={tokens.button.inline}
                                className="h-7 flex-1 text-xs capitalize"
                                onClick={() => updateBlockStyles(selectedBlock.id, { dividerStyle: style })}
                              >
                                {style}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Color</Label>
                          <ColorWheelPicker
                            value={selectedBlock.styles.textColor || '#e5e7eb'}
                            colorType="accent"
                            onChange={(v) => updateBlockStyles(selectedBlock.id, { textColor: v })}
                            themeColors={currentTheme.colors}
                          />
                        </div>
                      </div>
                    )}

                    {/* Spacer Controls */}
                    {selectedBlock.type === 'spacer' && (
                      <div className="space-y-3">
                        <Label className="text-xs font-medium">Spacer Settings</Label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Height</Label>
                            <span className="text-xs text-muted-foreground">{parseInt(selectedBlock.styles.height || '24') || 24}px</span>
                          </div>
                          <Slider
                            variant="filled"
                            min={8}
                            max={120}
                            step={4}
                            value={[parseInt(selectedBlock.styles.height || '24') || 24]}
                            onValueChange={([value]) => updateBlockStyles(selectedBlock.id, { height: `${value}px` })}
                          />
                        </div>
                      </div>
                    )}

                    {/* Common settings */}
                    {selectedBlock.type !== 'divider' && selectedBlock.type !== 'spacer' && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Alignment</Label>
                          <div className="flex gap-1">
                            {(['left', 'center', 'right'] as const).map(align => (
                              <Button
                                key={align}
                                variant={selectedBlock.styles.textAlign === align ? 'default' : 'outline'}
                                size={tokens.button.inline}
                                className="h-8 w-8 p-0"
                                onClick={() => updateBlockStyles(selectedBlock.id, { textAlign: align })}
                              >
                                {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                                {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                                {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                              </Button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Padding/Spacing Controls */}
                        <div className="space-y-3 pt-2 border-t">
                          <Label className="text-xs text-muted-foreground font-medium">Spacing</Label>
                          {(() => {
                            // Get current padding values from individual props or parse from legacy string
                            const legacyPadding = selectedBlock.styles.padding || '24px';
                            const parsed = parsePaddingToValues(legacyPadding);
                            const currentTop = selectedBlock.styles.paddingTop ?? parsed.top;
                            const currentBottom = selectedBlock.styles.paddingBottom ?? parsed.bottom;
                            const currentHorizontal = selectedBlock.styles.paddingHorizontal ?? parsed.horizontal;
                            
                            return (
                              <>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Top Padding</Label>
                                    <span className="text-xs text-muted-foreground">{currentTop}px</span>
                                  </div>
                                  <Slider
                                    variant="filled"
                                    min={0}
                                    max={80}
                                    step={4}
                                    value={[currentTop]}
                                    onValueChange={([value]) => updateBlockStyles(selectedBlock.id, { paddingTop: value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Bottom Padding</Label>
                                    <span className="text-xs text-muted-foreground">{currentBottom}px</span>
                                  </div>
                                  <Slider
                                    variant="filled"
                                    min={0}
                                    max={80}
                                    step={4}
                                    value={[currentBottom]}
                                    onValueChange={([value]) => updateBlockStyles(selectedBlock.id, { paddingBottom: value })}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Horizontal Padding</Label>
                                    <span className="text-xs text-muted-foreground">{currentHorizontal}px</span>
                                  </div>
                                  <Slider
                                    variant="filled"
                                    min={0}
                                    max={80}
                                    step={4}
                                    value={[currentHorizontal]}
                                    onValueChange={([value]) => updateBlockStyles(selectedBlock.id, { paddingHorizontal: value })}
                                  />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        
                        <div className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Background</Label>
                            <ColorWheelPicker
                              value={selectedBlock.styles.backgroundColor || 'transparent'}
                              colorType="light"
                              onChange={(v) => updateBlockStyles(selectedBlock.id, { backgroundColor: v })}
                              themeColors={currentTheme.colors}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Text Color</Label>
                            <ColorWheelPicker
                              value={selectedBlock.styles.textColor || '#000000'}
                              colorType="text"
                              onChange={(v) => updateBlockStyles(selectedBlock.id, { textColor: v })}
                              themeColors={currentTheme.colors}
                            />
                          </div>
                        </div>

                        {/* Background Opacity */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Background Opacity</Label>
                            <span className="text-xs text-muted-foreground">{selectedBlock.styles.backgroundOpacity ?? 100}%</span>
                          </div>
                          <Slider
                            variant="filled"
                            min={0}
                            max={100}
                            step={5}
                            value={[selectedBlock.styles.backgroundOpacity ?? 100]}
                            onValueChange={([value]) => updateBlockStyles(selectedBlock.id, { backgroundOpacity: value })}
                          />
                        </div>

                        {/* Border Controls */}
                        <div className="space-y-3 pt-2 border-t">
                          <Label className="text-xs text-muted-foreground font-medium">Border</Label>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Border Width</Label>
                              <span className="text-xs text-muted-foreground">{selectedBlock.styles.borderWidth || 0}px</span>
                            </div>
                            <Slider
                              variant="filled"
                              min={0}
                              max={8}
                              step={1}
                              value={[selectedBlock.styles.borderWidth || 0]}
                              onValueChange={([value]) => updateBlockStyles(selectedBlock.id, { borderWidth: value })}
                            />
                          </div>
                          {(selectedBlock.styles.borderWidth || 0) > 0 && (
                            <>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Border Style</Label>
                                <div className="flex gap-1">
                                  {(['solid', 'dashed', 'dotted'] as const).map(style => (
                                    <Button
                                      key={style}
                                      variant={(selectedBlock.styles.borderStyle || 'solid') === style ? 'default' : 'outline'}
                                      size={tokens.button.inline}
                                      className="h-7 flex-1 text-xs capitalize"
                                      onClick={() => updateBlockStyles(selectedBlock.id, { borderStyle: style })}
                                    >
                                      {style}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground">Border Color</Label>
                                <ColorWheelPicker
                                  value={selectedBlock.styles.borderColor || '#e5e7eb'}
                                  colorType="accent"
                                  onChange={(v) => updateBlockStyles(selectedBlock.id, { borderColor: v })}
                                  themeColors={currentTheme.colors}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Canvas */}
            <div className="lg:col-span-2">
              <div className="sticky top-4">
                <div className="font-medium text-sm mb-2">Email Canvas</div>
                {/* Sticky hint overlays at top of canvas */}
                {(hintsVisible.edit || hintsVisible.preview) && (
                  <div className="space-y-2 mb-3">
                    {hintsVisible.edit && (
                      <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-2.5 flex items-center gap-2">
                        <MousePointerClick className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-xs text-primary font-medium flex-1">Click any block below to edit its content and styling</span>
                        <button 
                          onClick={() => setHintsVisible(prev => ({ ...prev, edit: false }))}
                          className="text-primary/60 hover:text-primary transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    {hintsVisible.preview && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2.5 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span className="text-xs text-amber-700 font-medium flex-1">Remember to click Preview before finalizing your template to ensure no code errors</span>
                        <button 
                          onClick={() => setHintsVisible(prev => ({ ...prev, preview: false }))}
                          className="text-amber-600/60 hover:text-amber-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <ScrollArea className="h-[calc(100vh-280px)] max-h-[620px] border rounded-lg bg-muted/50 p-4">
                <div className="bg-white rounded-lg shadow-lg max-w-[600px] mx-auto overflow-hidden">
                  {blocks.map((block, index) => (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, block.id)}
                      onDragOver={(e) => {
                        // Handle normal block reordering
                        handleDragOver(e, block.id);
                        // Handle column block being dragged to main list
                        handleColumnBlockDragOverMain(e, block.id);
                      }}
                      onDragLeave={() => {
                        handleDragLeave();
                        handleColumnBlockDragLeaveMain();
                      }}
                      onDrop={(e) => {
                        // Check if it's a column block being dropped to main
                        if (draggedColumnBlock && columnBlockToMainTarget) {
                          handleColumnBlockDropToMain(e, block.id);
                        } else {
                          handleDrop(e, block.id);
                        }
                      }}
                      onDragEnd={handleDragEnd}
                      onMouseEnter={() => setHoveredBlockId(block.id)}
                      onMouseLeave={() => setHoveredBlockId(null)}
                      className={cn(
                        'relative cursor-pointer transition-all duration-200',
                        selectedBlockId === block.id && 'ring-2 ring-primary ring-offset-2',
                        draggedBlockId === block.id && 'opacity-50 scale-[0.98]',
                        recentlyMovedBlockId === block.id && 'animate-scale-in ring-2 ring-primary/50'
                      )}
                      style={{
                        outline: hoveredBlockId === block.id && selectedBlockId !== block.id 
                          ? `2px dashed ${getSectionType(block.type).color}` 
                          : undefined,
                        outlineOffset: hoveredBlockId === block.id && selectedBlockId !== block.id ? '2px' : undefined,
                      }}
                      onClick={() => setSelectedBlockId(block.id)}
                    >
                      {/* Section type indicator on hover */}
                      {hoveredBlockId === block.id && selectedBlockId !== block.id && (
                        <div 
                          className="absolute -top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-fade-in"
                        >
                          <span 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium text-white shadow-lg backdrop-blur-sm"
                            style={{ backgroundColor: getSectionType(block.type).color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                            {getSectionType(block.type).label}
                          </span>
                        </div>
                      )}
                      
                      {/* Drop zone indicator - ABOVE (for both main blocks and column blocks) */}
                      {((dragOverBlockId === block.id && dropPosition === 'above') ||
                        (columnBlockToMainTarget?.targetBlockId === block.id && columnBlockToMainTarget?.position === 'above')) && (
                        <div className="absolute -top-1 left-0 right-0 z-30 flex items-center pointer-events-none">
                          <div className="w-3 h-3 rounded-full bg-primary border-2 border-background shadow-md -ml-1.5" />
                          <div className="flex-1 h-0.5 bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.4)]" />
                          <div className="w-3 h-3 rounded-full bg-primary border-2 border-background shadow-md -mr-1.5" />
                        </div>
                      )}
                      
                      {/* Drop zone indicator - BELOW (for both main blocks and column blocks) */}
                      {((dragOverBlockId === block.id && dropPosition === 'below') ||
                        (columnBlockToMainTarget?.targetBlockId === block.id && columnBlockToMainTarget?.position === 'below')) && (
                        <div className="absolute -bottom-1 left-0 right-0 z-30 flex items-center pointer-events-none">
                          <div className="w-3 h-3 rounded-full bg-primary border-2 border-background shadow-md -ml-1.5" />
                          <div className="flex-1 h-0.5 bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.4)]" />
                          <div className="w-3 h-3 rounded-full bg-primary border-2 border-background shadow-md -mr-1.5" />
                        </div>
                      )}
                      
                      {/* Section name badge - fades to 10% on hover */}
                      {/* Section name badge - fades on hover */}
                      <div className={cn(
                        'absolute left-2 top-2 z-20 transition-opacity duration-200',
                        hoveredBlockId === block.id && 'opacity-10'
                      )}>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-foreground/80 text-background capitalize tracking-wide">
                          {block.type === 'social' ? 'Social Icons' : block.type}
                        </span>
                      </div>
                      {/* Drag handle indicator */}
                      <div className={cn(
                        'absolute left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 transition-opacity cursor-grab active:cursor-grabbing',
                        (hoveredBlockId === block.id || selectedBlockId === block.id) && 'opacity-100'
                      )}>
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                      </div>
                      {/* Block toolbar - top right corner */}
                      <div className={cn(
                        'absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity bg-background/90 backdrop-blur-sm rounded-md shadow-sm border p-0.5',
                        (hoveredBlockId === block.id || selectedBlockId === block.id) && 'opacity-100'
                      )}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                          disabled={index === 0}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                          disabled={index === blocks.length - 1}
                        >
                        <ChevronDown className="w-3 h-3" />
                        </Button>
                        <div className="w-px h-4 bg-border" />
                        {/* Column conversion buttons - only show for convertible block types */}
                        {block.type !== 'header' && block.type !== 'footer' && block.type !== 'columns' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={(e) => { e.stopPropagation(); convertToColumns(block.id, 2); }}
                              title="Convert to 2 columns"
                            >
                              <Columns2 className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={(e) => { e.stopPropagation(); convertToColumns(block.id, 3); }}
                              title="Convert to 3 columns"
                            >
                              <Columns3 className="w-3 h-3" />
                            </Button>
                            <div className="w-px h-4 bg-border" />
                          </>
                        )}
                        {/* Unwrap columns button - only show for columns blocks */}
                        {block.type === 'columns' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={(e) => { e.stopPropagation(); unwrapColumns(block.id); }}
                              title="Unwrap columns to individual blocks"
                            >
                              <Rows2 className="w-3 h-3" />
                            </Button>
                            <div className="w-px h-4 bg-border" />
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
                          title="Duplicate block"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" 
                          onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Block content preview */}
                      <div 
                        style={{
                          backgroundColor: block.styles.backgroundColor 
                            ? `rgba(${parseInt(block.styles.backgroundColor.slice(1, 3), 16)}, ${parseInt(block.styles.backgroundColor.slice(3, 5), 16)}, ${parseInt(block.styles.backgroundColor.slice(5, 7), 16)}, ${(block.styles.backgroundOpacity ?? 100) / 100})`
                            : undefined,
                          color: block.styles.textColor,
                          fontSize: block.styles.fontSize,
                          fontWeight: block.styles.fontWeight,
                          textAlign: block.styles.textAlign,
                          padding: computePadding(block.styles),
                          border: (block.styles.borderWidth || 0) > 0 
                            ? `${block.styles.borderWidth}px ${block.styles.borderStyle || 'solid'} ${block.styles.borderColor || '#e5e7eb'}`
                            : undefined,
                        }}
                      >
                        {block.type === 'heading' && (
                          <h1 
                            style={{ margin: 0, fontSize: block.styles.fontSize }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content.replace(/\n/g, '<br/>')) }}
                          />
                        )}
                        {block.type === 'text' && (
                          <p 
                            style={{ margin: 0, lineHeight: 1.6 }}
                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content.replace(/\n/g, '<br/>')) }}
                          />
                        )}
                        {block.type === 'image' && (
                          <div style={{ textAlign: block.styles.textAlign }}>
                            {block.imageUrl ? (
                              <img 
                                src={block.imageUrl} 
                                alt={block.content || 'Email image'} 
                                style={{ maxWidth: '100%', borderRadius: block.styles.borderRadius }}
                              />
                            ) : (
                              <div className="bg-muted flex items-center justify-center h-32 rounded">
                                <Image className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        )}
                        {block.type === 'button' && (() => {
                          const sizeScale = (block.styles.buttonSize || 100) / 100;
                          const paddingV = Math.round(16 * sizeScale);
                          const paddingH = Math.round(32 * sizeScale);
                          const fontSize = Math.round(16 * sizeScale);
                          const shapeRadius = block.styles.buttonShape === 'pill' ? '9999px' : block.styles.buttonShape === 'rectangle' ? '0px' : '8px';
                          return (
                            <div style={{ textAlign: block.styles.textAlign }}>
                              {block.styles.buttonVariant === 'secondary' ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    backgroundColor: block.styles.backgroundColor || '#f5f0e8',
                                    color: block.styles.buttonColor || '#1a1a1a',
                                    padding: `${paddingV}px ${paddingH}px`,
                                    fontWeight: 'bold',
                                    fontSize: `${fontSize}px`,
                                    borderRadius: shapeRadius,
                                    border: `2px solid ${block.styles.buttonColor || '#1a1a1a'}`,
                                  }}
                                >
                                  {block.content}
                                  {block.styles.buttonArrow && <ArrowRight className="inline-block ml-2" style={{ width: fontSize, height: fontSize }} />}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    backgroundColor: block.styles.buttonColor || '#3b82f6',
                                    color: block.styles.buttonTextColor || '#ffffff',
                                    padding: `${paddingV}px ${paddingH}px`,
                                    fontWeight: 'bold',
                                    fontSize: `${fontSize}px`,
                                    borderRadius: shapeRadius,
                                  }}
                                >
                                  {block.content}
                                  {block.styles.buttonArrow && <ArrowRight className="inline-block ml-2" style={{ width: fontSize, height: fontSize }} />}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        {block.type === 'link' && (() => {
                          const linkFontSize = Math.round(16 * ((block.styles.linkSize || 100) / 100));
                          return (
                            <p style={{ margin: 0, lineHeight: 1.6, fontSize: `${linkFontSize}px` }}>
                              <a 
                                href="#" 
                                onClick={(e) => e.preventDefault()}
                                style={{ 
                                  color: block.styles.buttonColor || '#3b82f6', 
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontSize: `${linkFontSize}px`
                                }}
                              >
                                {block.content}
                              </a>
                            </p>
                          );
                        })()}
                        {block.type === 'divider' && (() => {
                          const thickness = block.styles.dividerThickness || 1;
                          const style = block.styles.dividerStyle || 'solid';
                          const width = block.styles.dividerWidth || 100;
                          return (
                            <div style={{ textAlign: 'center', padding: '8px 0' }}>
                              <hr style={{ 
                                border: 'none', 
                                borderTop: `${thickness}px ${style} ${block.styles.textColor || '#e5e7eb'}`,
                                margin: '0 auto',
                                width: `${width}%`
                              }} />
                            </div>
                          );
                        })()}
                        {block.type === 'spacer' && (() => {
                          const height = parseInt(block.styles.height || '24') || 24;
                          return (
                            <div 
                              style={{ height: `${height}px` }} 
                              className="border-dashed border opacity-50 bg-muted/30 flex items-center justify-center"
                            >
                              <span className="text-[10px] text-muted-foreground">{height}px</span>
                            </div>
                          );
                        })()}
                        {block.type === 'social' && (() => {
                          const iconSize = block.styles.iconSize || 24;
                          return (
                            <div style={{ textAlign: block.styles.textAlign || 'center' }} className="flex items-center justify-center gap-4">
                              {(block.socialLinks || []).filter(link => link.enabled).map((link) => (
                                <div 
                                  key={link.platform}
                                  className="flex items-center justify-center"
                                  style={{ 
                                    color: block.styles.buttonColor || '#1a1a1a',
                                    width: `${iconSize + 8}px`,
                                    height: `${iconSize + 8}px`
                                  }}
                                >
                                  {link.platform === 'instagram' && <Instagram style={{ width: iconSize, height: iconSize }} />}
                                  {link.platform === 'tiktok' && (
                                    <svg style={{ width: iconSize, height: iconSize }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
                                    </svg>
                                  )}
                                  {link.platform === 'email' && <Mail style={{ width: iconSize, height: iconSize }} />}
                                </div>
                              ))}
                              {(block.socialLinks || []).filter(link => link.enabled).length === 0 && (
                                <span className="text-xs text-muted-foreground">No icons enabled</span>
                              )}
                            </div>
                          );
                        })()}
                        {block.type === 'footer' && (() => {
                          const defaultFooterConfig = { showLogo: true, logoId: 'brand-primary-white', logoSize: 'large' as const, logoPosition: 'center' as const, showSocialIcons: true, copyrightText: '© 2026 All rights reserved.' };
                          const footerConfig = block.footerConfig ? { ...defaultFooterConfig, ...block.footerConfig } : defaultFooterConfig;
                          // Ensure logoId is never empty/undefined
                          const logoId = (footerConfig.logoId && footerConfig.logoId.length > 0) ? footerConfig.logoId : 'brand-primary-white';
                          const logo = getLogoById(logoId) || brandLogos.find(l => l.variant === 'white') || brandLogos[0];
                          const enabledLinks = (block.socialLinks || []).filter(l => l.enabled);
                          const logoSizeMap = { xs: '50px', small: '80px', medium: '120px', large: '160px', xl: '220px' };
                          const logoMaxWidth = logoSizeMap[footerConfig.logoSize || 'large'];
                          const logoPosition = footerConfig.logoPosition || 'center';
                          // Ensure showLogo defaults to true if undefined
                          const showLogo = footerConfig.showLogo !== false;
                          
                          const alignClass = logoPosition === 'left' ? 'items-start text-left' 
                            : logoPosition === 'right' ? 'items-end text-right' 
                            : 'items-center text-center';
                          
                          return (
                            <div className={`flex flex-col ${alignClass}`}>
                              {showLogo && logo && (
                                <div className="mb-3" style={{ minHeight: '30px' }}>
                                  <img 
                                    src={logo.src} 
                                    alt={logo.name} 
                                    style={{ maxWidth: logoMaxWidth, height: 'auto', display: 'block', minHeight: '20px' }}
                                  />
                                </div>
                              )}
                              {footerConfig.showSocialIcons && enabledLinks.length > 0 && (
                                <div className={`flex items-center gap-3 mb-3 ${logoPosition === 'center' ? 'justify-center' : logoPosition === 'right' ? 'justify-end' : 'justify-start'}`}>
                                  {enabledLinks.map((link) => (
                                    <div 
                                      key={link.platform}
                                      className="w-6 h-6 flex items-center justify-center"
                                      style={{ color: block.styles.buttonColor || '#f5f0e8' }}
                                    >
                                      {link.platform === 'instagram' && <Instagram className="w-5 h-5" />}
                                      {link.platform === 'tiktok' && (
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
                                        </svg>
                                      )}
                                      {link.platform === 'email' && <Mail className="w-5 h-5" />}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p style={{ margin: 0, fontSize: '11px', opacity: 0.8 }}>{footerConfig.copyrightText}</p>
                            </div>
                          );
                        })()}
                        {block.type === 'header' && (() => {
                          const headerConfig = block.headerConfig || { showLogo: true, logoId: 'brand-primary-white', showNavLinks: true };
                          const logo = getLogoById(headerConfig.logoId) || brandLogos[0];
                          const enabledLinks = (block.navLinks || []).filter(l => l.enabled);
                          const logoSizeMap = { xs: '50px', small: '80px', medium: '120px', large: '160px', xl: '220px' };
                          const logoMaxWidth = logoSizeMap[headerConfig.logoSize || 'medium'];
                          const logoPosition = headerConfig.logoPosition || 'left';
                          const navLinksPosition = headerConfig.navLinksPosition || 'right';
                          
                          const logoElement = headerConfig.showLogo && logo ? (
                            <img 
                              src={logo.src} 
                              alt={logo.name} 
                              style={{ maxWidth: logoMaxWidth, height: 'auto', display: 'block' }}
                            />
                          ) : null;
                          
                          const navElement = headerConfig.showNavLinks && enabledLinks.length > 0 ? (
                            <div className="flex items-center gap-4">
                              {enabledLinks.map((link, index) => (
                                <span 
                                  key={index}
                                  className="text-xs font-medium inline-flex items-center gap-1"
                                  style={{ color: block.styles.textColor || '#f5f0e8' }}
                                >
                                  {link.label}
                                  {link.showArrow && <ArrowRight className="w-3 h-3" />}
                                </span>
                              ))}
                            </div>
                          ) : null;
                          
                          // Use 3-column grid for independent logo and nav positioning
                          return (
                            <div className="grid grid-cols-3 items-center w-full px-4">
                              {/* Left column */}
                              <div className="flex justify-start">
                                {logoPosition === 'left' && logoElement}
                                {navLinksPosition === 'left' && navElement}
                              </div>
                              {/* Center column */}
                              <div className="flex justify-center">
                                {logoPosition === 'center' && logoElement}
                                {navLinksPosition === 'center' && navElement}
                              </div>
                              {/* Right column */}
                              <div className="flex justify-end">
                                {logoPosition === 'right' && logoElement}
                                {navLinksPosition === 'right' && navElement}
                              </div>
                            </div>
                          );
                        })()}
                        {block.type === 'columns' && (() => {
                          const config = block.columnsConfig || { columnCount: 2, columns: [], columnBlocks: [[], []], gap: 16 };
                          const columnCount = config.columnCount;
                          const gap = config.gap || 16;
                          const columnBlocks = config.columnBlocks || [[], []];
                          
                          return (
                            <div className="flex w-full" style={{ gap: `${gap}px` }}>
                              {columnBlocks.slice(0, columnCount).map((colBlocks, colIndex) => {
                                // Check if this column is a drop target for main block or column block
                                const isColumnBlockTarget = dropTargetColumnBlock?.parentBlockId === block.id &&
                                  dropTargetColumnBlock?.colIndex === colIndex;
                                const isMainBlockTarget = mainBlockDragTarget?.parentBlockId === block.id &&
                                  mainBlockDragTarget?.colIndex === colIndex;
                                const isDropTarget = isColumnBlockTarget || isMainBlockTarget;
                                
                                return (
                                <div 
                                  key={colIndex}
                                  className={cn(
                                    "flex-1 min-h-[60px] rounded border border-dashed p-2 transition-colors",
                                    isDropTarget
                                      ? "border-primary bg-primary/5"
                                      : "border-muted-foreground/30"
                                  )}
                                  data-column-block-drop-zone
                                  onDragOver={(e) => {
                                    // Handle column block drag
                                    handleColumnBlockDragOver(e, block.id, colIndex, null);
                                    // Handle main block drag into column
                                    handleMainBlockDragOverColumn(e, block.id, colIndex, null);
                                  }}
                                  onDragLeave={(e) => {
                                    handleColumnBlockDragLeave(e);
                                    handleMainBlockDragLeaveColumn(e);
                                  }}
                                  onDrop={(e) => {
                                    // Check if it's a main block being dropped
                                    if (draggedBlockId && !draggedColumnBlock) {
                                      handleMainBlockDropInColumn(e, block.id, colIndex, null);
                                    } else {
                                      handleColumnBlockDrop(e, block.id, colIndex, null);
                                    }
                                  }}
                                >
                                  {colBlocks.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground italic">
                                      {(draggedColumnBlock || draggedBlockId) ? "Drop here" : `Column ${colIndex + 1}`}
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {colBlocks.map((colBlock, blockIndex) => (
                                        <div key={colBlock.id}>
                                          {/* Drop zone above each block - accepts both column blocks and main blocks */}
                                          <div 
                                            className={cn(
                                              "h-0.5 -my-0.5 transition-all rounded",
                                              ((dropTargetColumnBlock?.parentBlockId === block.id &&
                                              dropTargetColumnBlock?.colIndex === colIndex &&
                                              dropTargetColumnBlock?.blockIndex === blockIndex) ||
                                              (mainBlockDragTarget?.parentBlockId === block.id &&
                                              mainBlockDragTarget?.colIndex === colIndex &&
                                              mainBlockDragTarget?.blockIndex === blockIndex))
                                                ? "bg-primary h-1"
                                                : "bg-transparent"
                                            )}
                                            onDragOver={(e) => {
                                              handleColumnBlockDragOver(e, block.id, colIndex, blockIndex);
                                              handleMainBlockDragOverColumn(e, block.id, colIndex, blockIndex);
                                            }}
                                            onDrop={(e) => {
                                              if (draggedBlockId && !draggedColumnBlock) {
                                                handleMainBlockDropInColumn(e, block.id, colIndex, blockIndex);
                                              } else {
                                                handleColumnBlockDrop(e, block.id, colIndex, blockIndex);
                                              }
                                            }}
                                          />
                                          <div 
                                            draggable
                                            onDragStart={(e) => handleColumnBlockDragStart(e, block.id, colIndex, blockIndex, colBlock)}
                                            onDragEnd={handleColumnBlockDragEnd}
                                            className={cn(
                                              "rounded relative group/colblock cursor-grab active:cursor-grabbing transition-all",
                                              draggedColumnBlock?.block.id === colBlock.id && "opacity-50 scale-[0.98]"
                                            )}
                                          >
                                            {/* Drag handle overlay - shows on hover */}
                                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/colblock:opacity-100 transition-opacity z-10">
                                              <GripVertical className="w-3 h-3 text-primary" />
                                            </div>
                                            {colBlock.type === 'heading' && (
                                              <h3 style={{ 
                                                margin: 0, 
                                                fontSize: colBlock.styles.fontSize || '18px',
                                                textAlign: colBlock.styles.textAlign || 'center',
                                                color: colBlock.styles.textColor,
                                                fontWeight: 'bold',
                                                lineHeight: 1.3
                                              }}>
                                                {colBlock.content}
                                              </h3>
                                            )}
                                            {colBlock.type === 'text' && (
                                              <p style={{ 
                                                margin: 0, 
                                                fontSize: colBlock.styles.fontSize || '14px',
                                                textAlign: colBlock.styles.textAlign || 'center',
                                                color: colBlock.styles.textColor,
                                                lineHeight: 1.5
                                              }}>
                                                {colBlock.content}
                                              </p>
                                            )}
                                            {colBlock.type === 'button' && (() => {
                                              const isSecondary = colBlock.styles.buttonVariant === 'secondary';
                                              const sizeScale = (colBlock.styles.buttonSize || 100) / 100;
                                              const paddingV = Math.round(10 * sizeScale);
                                              const paddingH = Math.round(20 * sizeScale);
                                              const fontSize = Math.round(13 * sizeScale);
                                              const shapeRadius = colBlock.styles.buttonShape === 'pill' ? '9999px' : colBlock.styles.buttonShape === 'rectangle' ? '0px' : '6px';
                                              return (
                                                <div style={{ textAlign: colBlock.styles.textAlign || 'center' }}>
                                                  <span
                                                    style={{
                                                      display: 'inline-block',
                                                      backgroundColor: isSecondary ? 'transparent' : (colBlock.styles.buttonColor || '#000000'),
                                                      color: isSecondary ? (colBlock.styles.buttonColor || '#000000') : (colBlock.styles.buttonTextColor || '#ffffff'),
                                                      padding: `${paddingV}px ${paddingH}px`,
                                                      fontWeight: 'bold',
                                                      fontSize: `${fontSize}px`,
                                                      borderRadius: shapeRadius,
                                                      border: isSecondary ? `2px solid ${colBlock.styles.buttonColor || '#000000'}` : 'none',
                                                    }}
                                                  >
                                                    {colBlock.content}
                                                  </span>
                                                </div>
                                              );
                                            })()}
                                            {colBlock.type === 'link' && (
                                              <p style={{ margin: 0, textAlign: colBlock.styles.textAlign || 'center' }}>
                                                <span style={{ color: colBlock.styles.buttonColor || '#3b82f6', textDecoration: 'underline', fontSize: '14px' }}>
                                                  {colBlock.content}
                                                </span>
                                              </p>
                                            )}
                                            {colBlock.type === 'image' && colBlock.imageUrl && (
                                              <div style={{ textAlign: colBlock.styles.textAlign || 'center' }}>
                                                <img src={colBlock.imageUrl} alt={colBlock.content || 'Image'} className="max-w-full h-auto" />
                                              </div>
                                            )}
                                            {colBlock.type === 'divider' && (
                                              <div style={{ textAlign: 'center', padding: '4px 0' }}>
                                                <hr style={{ 
                                                  border: 'none', 
                                                  borderTop: `${colBlock.styles.dividerThickness || 1}px ${colBlock.styles.dividerStyle || 'solid'} ${colBlock.styles.textColor || '#e5e7eb'}`,
                                                  margin: '0 auto',
                                                  width: `${colBlock.styles.dividerWidth || 100}%`
                                                }} />
                                              </div>
                                            )}
                                            {colBlock.type === 'spacer' && (
                                              <div style={{ height: colBlock.styles.height || '16px' }} />
                                            )}
                                            {colBlock.type === 'social' && (
                                              <div style={{ textAlign: colBlock.styles.textAlign || 'center' }} className="flex items-center justify-center gap-2">
                                                {(colBlock.socialLinks || []).filter(link => link.enabled).map((link) => (
                                                  <div key={link.platform} style={{ color: colBlock.styles.buttonColor || '#1a1a1a' }}>
                                                    {link.platform === 'instagram' && <Instagram className="w-5 h-5" />}
                                                    {link.platform === 'email' && <Mail className="w-5 h-5" />}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )})}
                            </div>
                          );
                        })()}
                        {block.type === 'signature' && (() => {
                          const config = block.signatureConfig || { name: 'Your Name', title: 'Your Title', imageUrl: '', layout: 'horizontal-left', imageSize: 80, indent: 0 };
                          const layout = config.layout || 'horizontal-left';
                          const imageSize = config.imageSize || 80;
                          const indent = config.indent || 0;
                          
                          const imageElement = config.imageUrl ? (
                            <img 
                              src={config.imageUrl} 
                              alt="Signature"
                              className="rounded-full object-cover"
                              style={{ width: `${imageSize}px`, height: `${imageSize}px` }}
                            />
                          ) : (
                            <div 
                              className="rounded-full bg-muted flex items-center justify-center"
                              style={{ width: `${imageSize}px`, height: `${imageSize}px` }}
                            >
                              <PenTool className="w-6 h-6 text-muted-foreground" />
                            </div>
                          );
                          
                          const textElement = (
                            <div>
                              <div className="font-medium text-base">{config.name}</div>
                              <div className="text-sm opacity-80">{config.title}</div>
                              {(config.showPhone && config.phone) && (
                                <div className="text-xs opacity-70 mt-1">📞 {config.phone}</div>
                              )}
                              {(config.showEmail && config.email) && (
                                <div className="text-xs opacity-70">✉️ {config.email}</div>
                              )}
                            </div>
                          );
                          
                          const wrapperStyle = { paddingLeft: indent > 0 ? `${indent}px` : undefined };
                          
                          if (layout === 'stacked') {
                            return (
                              <div className="flex flex-col items-center gap-3" style={wrapperStyle}>
                                {imageElement}
                                {textElement}
                              </div>
                            );
                          } else if (layout === 'horizontal-right') {
                            return (
                              <div className="flex items-center gap-4" style={wrapperStyle}>
                                {textElement}
                                {imageElement}
                              </div>
                            );
                          } else {
                            // horizontal-left (default)
                            return (
                              <div className="flex items-center gap-4" style={wrapperStyle}>
                                {imageElement}
                                {textElement}
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  ))}
                  
                  {blocks.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Add blocks to build your email</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="code" className="mt-4">
          <Textarea
            value={rawHtml}
            onChange={(e) => handleRawHtmlChange(e.target.value)}
            className="font-mono text-xs min-h-[500px]"
            placeholder="HTML email body..."
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="border rounded-lg bg-gray-100 p-4">
            {/* Link validation status */}
            {(() => {
              const linkIssues = getLinkValidation();
              return (
                <div className="mb-3 space-y-2">
                  {linkIssues.length === 0 ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-md py-1.5 px-3">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      All links are valid
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {linkIssues.length} invalid {linkIssues.length === 1 ? 'link' : 'links'} detected
                      </div>
                      <ul className="space-y-1">
                        {linkIssues.map((issue, i) => (
                          <li key={i} className="text-[10px] text-amber-600 flex items-start gap-1.5 pl-5">
                            <span className="font-medium capitalize">{issue.blockType}:</span>
                            <span className="truncate max-w-[200px]" title={issue.url}>"{issue.url}"</span>
                            <span className="text-amber-500">({issue.label})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                    <MousePointerClick className="w-3.5 h-3.5" />
                    Links are clickable — click any button or link to test
                  </p>
                </div>
              );
            })()}
            <div className="bg-white rounded-lg shadow-lg max-w-[600px] mx-auto p-0 overflow-hidden">
              <div
                className="[&_a]:cursor-pointer [&_a:hover]:opacity-80 [&_a]:transition-opacity"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(renderPreviewHtml(blocksToHtml(blocks))),
                }}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Image Crop Modal */}
      <ImageCropModal
        open={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          setCropImageFile(null);
          setCropTargetBlockId(null);
        }}
        imageFile={cropImageFile}
        onCropComplete={handleCroppedImageUpload}
        maxOutputSize={400}
      />
    </div>
  );
});
