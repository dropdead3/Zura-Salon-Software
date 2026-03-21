import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Camera, BookOpen } from 'lucide-react';
import { 
  useOnboardingSectionConfig, 
  useUpsertSectionConfig,
  getSectionConfig 
} from '@/hooks/useOnboardingConfig';

interface OnboardingSectionsConfigPanelProps {
  selectedRole: string;
  organizationId: string | undefined;
}

const SECTIONS = [
  { 
    key: 'business_card', 
    label: 'Business Card Request', 
    description: 'Allow team members to request personalized business cards',
    icon: CreditCard 
  },
  { 
    key: 'headshot', 
    label: 'Headshot Session', 
    description: 'Enable scheduling professional headshot photography sessions',
    icon: Camera 
  },
  { 
    key: 'handbooks', 
    label: 'Handbook Acknowledgments', 
    description: 'Require acknowledgment of onboarding handbooks and documents',
    icon: BookOpen 
  },
];

export function OnboardingSectionsConfigPanel({ 
  selectedRole, 
  organizationId 
}: OnboardingSectionsConfigPanelProps) {
  const { data: configs, isLoading } = useOnboardingSectionConfig(organizationId);
  const upsertConfig = useUpsertSectionConfig();

  if (!organizationId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="font-sans text-sm">Organization not found.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleToggle = (
    sectionKey: string, 
    field: 'isEnabled' | 'isRequired', 
    value: boolean
  ) => {
    const current = getSectionConfig(configs, sectionKey, selectedRole);
    
    upsertConfig.mutate({
      organizationId,
      sectionKey,
      role: selectedRole,
      isEnabled: field === 'isEnabled' ? value : current.isEnabled,
      isRequired: field === 'isRequired' ? value : current.isRequired,
    });
  };

  return (
    <div className="space-y-3">
      {SECTIONS.map((section) => {
        const config = getSectionConfig(configs, section.key, selectedRole);
        const Icon = section.icon;
        
        return (
          <div
            key={section.key}
            className={`p-4 rounded-lg border transition-all ${
              config.isEnabled 
                ? 'bg-background border-border' 
                : 'bg-muted/30 border-muted opacity-60'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Switch
                  checked={config.isEnabled}
                  onCheckedChange={(checked) => 
                    handleToggle(section.key, 'isEnabled', checked)
                  }
                  disabled={upsertConfig.isPending}
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`font-sans text-sm block ${!config.isEnabled ? 'text-muted-foreground' : ''}`}>
                      {section.label}
                    </span>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </div>
              
              {config.isEnabled && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(section.key, 'isRequired', !config.isRequired)}
                    className="transition-colors"
                    disabled={upsertConfig.isPending}
                  >
                    {config.isRequired ? (
                      <Badge variant="destructive" className="text-[10px] cursor-pointer hover:opacity-80">
                        Required
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">
                        Optional
                      </Badge>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
