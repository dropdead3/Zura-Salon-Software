import { ShieldX, Eye, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useRoles } from '@/hooks/useRoles';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface AccessDeniedViewProps {
  role: AppRole | null;
  permission?: string;
  onExitViewAs: () => void;
}

export function AccessDeniedView({ role, permission, onExitViewAs }: AccessDeniedViewProps) {
  const navigate = useNavigate();
  const { data: roles = [] } = useRoles();
  
  const roleInfo = roles.find(r => r.name === role);
  const roleLabel = roleInfo?.display_name || role || 'this role';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl">Access Restricted</CardTitle>
            <CardDescription className="text-base">
              This page is not accessible to the{' '}
              <Badge variant="secondary" className="font-medium">
                {roleLabel}
              </Badge>{' '}
              role.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
            <Eye className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">You're in "View As" mode</p>
              <p>
                You're simulating the {roleLabel} experience. Exit View As mode to access this page with your full permissions.
              </p>
            </div>
          </div>
          
          {permission && (
            <p className="text-xs text-muted-foreground text-center">
              Required permission: <code className="px-1.5 py-0.5 rounded bg-muted">{permission}</code>
            </p>
          )}
          
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={onExitViewAs} className="w-full">
              Exit View As Mode
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
