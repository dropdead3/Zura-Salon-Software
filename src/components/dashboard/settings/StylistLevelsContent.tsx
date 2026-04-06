import { ReactNode } from 'react';
import { StylistLevelsEditor } from '@/components/dashboard/settings/StylistLevelsEditor';

interface StylistLevelsContentProps {
  onActions?: (actions: ReactNode) => void;
}

/**
 * Settings embed for Stylist Levels.
 * Renders the full editor inline within the Settings page.
 */
export function StylistLevelsContent({ onActions }: StylistLevelsContentProps) {
  return <StylistLevelsEditor embedded onActions={onActions} />;
}
