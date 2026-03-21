import { ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export interface StyleOverrides {
  background_type: 'none' | 'color' | 'gradient' | 'image';
  background_value: string;
  padding_top: number;
  padding_bottom: number;
  max_width: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  text_color_override: string;
  border_radius: number;
}

export const DEFAULT_STYLE_OVERRIDES: StyleOverrides = {
  background_type: 'none',
  background_value: '',
  padding_top: 0,
  padding_bottom: 0,
  max_width: 'full',
  text_color_override: '',
  border_radius: 0,
};

const MAX_WIDTH_CLASSES: Record<string, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'w-full',
};

interface SectionStyleWrapperProps {
  styleOverrides?: Partial<StyleOverrides>;
  children: ReactNode;
  className?: string;
}

export function SectionStyleWrapper({ styleOverrides, children, className }: SectionStyleWrapperProps) {

  const merged = { ...DEFAULT_STYLE_OVERRIDES, ...styleOverrides };
  
  const outerStyle: CSSProperties = {};
  
  // Background
  if (merged.background_type === 'color' && merged.background_value) {
    outerStyle.backgroundColor = merged.background_value;
  } else if (merged.background_type === 'gradient' && merged.background_value) {
    outerStyle.background = merged.background_value;
  } else if (merged.background_type === 'image' && merged.background_value) {
    outerStyle.backgroundImage = `url(${merged.background_value})`;
    outerStyle.backgroundSize = 'cover';
    outerStyle.backgroundPosition = 'center';
  }

  // Padding (only apply if non-zero, to avoid overriding section defaults)
  if (merged.padding_top > 0) outerStyle.paddingTop = `${merged.padding_top}px`;
  if (merged.padding_bottom > 0) outerStyle.paddingBottom = `${merged.padding_bottom}px`;

  // Text color
  if (merged.text_color_override) {
    outerStyle.color = merged.text_color_override;
  }

  // Border radius
  if (merged.border_radius > 0) {
    outerStyle.borderRadius = `${merged.border_radius}px`;
    outerStyle.overflow = 'clip';
  }

  const maxWidthClass = merged.max_width !== 'full' ? MAX_WIDTH_CLASSES[merged.max_width] : '';

  return (
    <div style={outerStyle} className={cn('relative', className)}>
      <div className={cn(maxWidthClass, maxWidthClass && 'mx-auto')}>
        {children}
      </div>
    </div>
  );
}
