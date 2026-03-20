import { cn } from '@/lib/utils';
import { SECTION_LABELS, isBuiltInSection, type CustomSectionConfig } from '@/hooks/useSidebarLayout';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

// Map hrefs to their labels for the preview
const LINK_CONFIG: Record<string, { label: string }> = {
  // Main
  dashPath('/'): { label: 'Command Center' },
  dashPath('/schedule'): { label: 'Schedule' },
  dashPath('/team-chat'): { label: 'Team Chat' },
  // My Tools
  dashPath('/today-prep'): { label: "Today's Prep" },
  dashPath('/waitlist'): { label: 'Waitlist' },
  dashPath('/stats'): { label: 'My Stats' },
  dashPath('/my-pay'): { label: 'My Pay' },
  dashPath('/training'): { label: 'Training' },
  dashPath('/program'): { label: 'New-Client Engine Program' },
  dashPath('/leaderboard'): { label: 'Team Leaderboard' },
  dashPath('/shift-swaps'): { label: 'Shift Swaps' },
  dashPath('/rewards'): { label: 'Rewards' },
  dashPath('/ring-the-bell'): { label: 'Ring the Bell' },
  dashPath('/my-graduation'): { label: 'My Graduation' },
  // Manage (hub links)
  dashPath('/admin/analytics'): { label: 'Analytics Hub' },
  dashPath('/admin/team-hub'): { label: 'Operations Hub' },
  dashPath('/admin/client-hub'): { label: 'Client Hub' },
  dashPath('/admin/growth-hub'): { label: 'Growth Hub' },
  dashPath('/admin/payroll'): { label: 'Hiring & Payroll Hub' },
  dashPath('/admin/booth-renters'): { label: 'Renter Hub' },
  // System
  dashPath('/admin/access-hub'): { label: 'Roles & Controls Hub' },
  dashPath('/admin/settings'): { label: 'Settings' },
  // Legacy / other
  dashPath('/onboarding'): { label: 'Onboarding' },
};

interface SidebarPreviewProps {
  sectionOrder: string[];
  linkOrder: Record<string, string[]>;
  hiddenSections: string[];
  hiddenLinks: Record<string, string[]>;
  customSections: Record<string, CustomSectionConfig>;
}

export function SidebarPreview({
  sectionOrder,
  linkOrder,
  hiddenSections,
  hiddenLinks,
  customSections,
}: SidebarPreviewProps) {
  const { dashPath } = useOrgDashboardPath();
  // Filter out hidden sections
  const visibleSections = sectionOrder.filter(s => !hiddenSections.includes(s));

  // Get section name
  const getSectionName = (sectionId: string): string => {
    if (isBuiltInSection(sectionId)) {
      return SECTION_LABELS[sectionId] || sectionId;
    }
    return customSections[sectionId]?.name || sectionId;
  };

  return (
    <div className="border rounded-lg bg-sidebar h-[500px] overflow-y-auto">
      {/* Logo area */}
      <div className="p-4 border-b border-border">
        <span className="font-display text-sm uppercase tracking-wider text-foreground">
          SALON
        </span>
        <p className="text-xs text-muted-foreground mt-1">Staff Dashboard</p>
      </div>

      {/* Navigation preview */}
      <div className="py-3">
        {visibleSections.map((sectionId, index) => {
          const links = linkOrder[sectionId] || [];
          const sectionHiddenLinks = hiddenLinks[sectionId] || [];
          const visibleLinks = links.filter(href => !sectionHiddenLinks.includes(href));

          if (visibleLinks.length === 0) return null;

          const isCustom = !isBuiltInSection(sectionId);

          return (
            <div key={sectionId}>
              {/* Divider for all sections except the first */}
              {index > 0 && (
                <div className="px-3 my-3">
                  <div className="h-px bg-border" />
                </div>
              )}
              
              {/* Section label - skip for 'main' to match actual sidebar */}
              {sectionId !== 'main' && (
                <p className={cn(
                  "px-3 mb-1.5 text-[10px] uppercase tracking-wider font-display font-medium",
                  isCustom ? "text-primary" : "text-foreground"
                )}>
                  {getSectionName(sectionId)}
                </p>
              )}
              
              {/* Links */}
              {visibleLinks.map((href) => {
                const config = LINK_CONFIG[href];
                if (!config) return null;
                
                return (
                  <div
                    key={href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground",
                      "hover:bg-muted/50 transition-colors cursor-default"
                    )}
                  >
                    <div className="w-3 h-3 rounded bg-muted" />
                    <span className="truncate">{config.label}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
