import { Shield } from 'lucide-react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPermissionsMatrix } from '@/components/platform/PlatformPermissionsMatrix';

export default function PlatformPermissions() {

  return (
    <PlatformPageContainer className="space-y-8">
      {/* Header */}
      <div>
        
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-violet-500/20">
            <Shield className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-display text-white">Permission Configurator</h1>
            <p className="text-slate-400 mt-1">
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
