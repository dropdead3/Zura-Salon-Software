import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useRoleTemplates, RoleTemplate } from '@/hooks/useRoleTemplates';
import { usePermissions } from '@/hooks/usePermissions';
import { getRoleColorClasses } from './RoleColorPicker';
import * as LucideIcons from 'lucide-react';
import { 
  Files, 
  CircleDot, 
  Check, 
  Shield,
  Sparkles,
} from 'lucide-react';

interface RoleTemplateSelectorProps {
  selectedTemplate: RoleTemplate | null;
  onSelect: (template: RoleTemplate | null) => void;
}

const getIconComponent = (iconName: string | null): React.ComponentType<{ className?: string }> => {
  if (!iconName) return CircleDot;
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[iconName] || CircleDot;
};

export function RoleTemplateSelector({ selectedTemplate, onSelect }: RoleTemplateSelectorProps) {
  const { data: templates, isLoading: templatesLoading } = useRoleTemplates();
  const { data: permissions } = usePermissions();

  const getPermissionCount = (template: RoleTemplate) => {
    return template.permission_ids?.length || 0;
  };

  const getPermissionNames = (template: RoleTemplate) => {
    if (!permissions || !template.permission_ids) return [];
    return permissions
      .filter(p => template.permission_ids.includes(p.id))
      .map(p => p.display_name)
      .slice(0, 5);
  };

  if (templatesLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Files className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No templates available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* No template option */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "w-full p-3 rounded-lg border text-left transition-all",
          "hover:bg-muted/50",
          !selectedTemplate 
            ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
            : "border-border"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Files className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Start from Scratch</p>
            <p className="text-xs text-muted-foreground">No permissions pre-configured</p>
          </div>
          {!selectedTemplate && (
            <Check className="w-5 h-5 text-primary shrink-0" />
          )}
        </div>
      </button>

      {/* Template options */}
      {templates.map(template => {
        const Icon = getIconComponent(template.icon);
        const colorClasses = getRoleColorClasses(template.color);
        const isSelected = selectedTemplate?.id === template.id;
        const permCount = getPermissionCount(template);
        const permNames = getPermissionNames(template);

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className={cn(
              "w-full p-3 rounded-lg border text-left transition-all",
              "hover:bg-muted/50",
              isSelected 
                ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                : "border-border"
            )}
          >
            <div className="flex items-start gap-3">
              <div 
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  colorClasses.bg
                )}
              >
                <Icon className={cn("w-5 h-5", colorClasses.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{template.display_name}</p>
                  {template.is_system && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                      Built-in
                    </Badge>
                  )}
                </div>
                {template.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {template.description}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                    <Shield className="w-2.5 h-2.5" />
                    {permCount} permissions
                  </Badge>
                  {permNames.length > 0 && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      {permNames.join(', ')}
                      {permCount > 5 && '...'}
                    </span>
                  )}
                </div>
              </div>
              {isSelected && (
                <Check className="w-5 h-5 text-primary shrink-0 mt-1" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
