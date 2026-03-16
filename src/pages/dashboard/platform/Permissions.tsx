import { Shield } from 'lucide-react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPermissionsMatrix } from '@/components/platform/PlatformPermissionsMatrix';

export default function PlatformPermissions() {

  return (
    <PlatformPageContainer className="space-y-8">
      {/* Header */}
      <div>
        
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[hsl(var(--platform-primary)/0.2)]">
            <Shield className="h-6 w-6 text-[hsl(var(--platform-primary))]" />
          </div>
          <div>
            <h1 className="text-3xl font-display text-[hsl(var(--platform-foreground))]">Permission Configurator</h1>
            <p className="text-[hsl(var(--platform-foreground-muted))] mt-1">
              Manage what each platform role can access and modify
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <PlatformPermissionsMatrix />
    </PlatformPageContainer>
  );
}
