/**
 * INSPECTOR GROUP
 * 
 * Collapsible section within the Inspector panel.
 * Uses Radix Collapsible with chevron rotation.
 * Only one group expanded by default.
 */

import { type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { editorTokens } from '../editor-tokens';

interface InspectorGroupProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function InspectorGroup({
  title,
  defaultOpen = false,
  children,
  className,
}: InspectorGroupProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className={cn(editorTokens.inspector.groupDivider, className)}>
      <CollapsibleTrigger className={editorTokens.inspector.groupHeader}>
        <span>{title}</span>
        <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] data-[state=open]:rotate-90 [[data-state=open]>&]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className={editorTokens.inspector.groupContent}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
