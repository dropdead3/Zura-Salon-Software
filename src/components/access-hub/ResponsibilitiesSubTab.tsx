import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
import { RoleIconPicker } from '@/components/dashboard/RoleIconPicker';
import { RoleColorPicker } from '@/components/dashboard/RoleColorPicker';
import { ResponsibilityCard } from './ResponsibilityCard';
import {
  useAllResponsibilities,
  useCreateResponsibility,
  useUpdateResponsibility,
  useArchiveResponsibility,
  useRestoreResponsibility,
  useDeleteResponsibility,
  useReorderResponsibilities,
} from '@/hooks/useResponsibilities';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface ResponsibilitiesSubTabProps {
  canManage: boolean;
}

export function ResponsibilitiesSubTab({ canManage }: ResponsibilitiesSubTabProps) {
  const { selectedOrganization } = useOrganizationContext();
  const organizationId = selectedOrganization?.id;
  const { data: responsibilities = [], isLoading } = useAllResponsibilities();
  const createMutation = useCreateResponsibility();
  const updateMutation = useUpdateResponsibility();
  const archiveMutation = useArchiveResponsibility();
  const restoreMutation = useRestoreResponsibility();
  const deleteMutation = useDeleteResponsibility();
  const reorderMutation = useReorderResponsibilities();

  const [showCreate, setShowCreate] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newData, setNewData] = useState({
    display_name: '',
    description: '',
    icon: 'Star',
    color: 'blue',
  });

  const activeResponsibilities = responsibilities.filter(r => r.is_active);
  const archivedResponsibilities = responsibilities.filter(r => !r.is_active);

  const handleCreate = () => {
    if (!newData.display_name.trim() || !organizationId) return;
    createMutation.mutate(
      {
        name: newData.display_name.toLowerCase().replace(/\s+/g, '_'),
        display_name: newData.display_name,
        description: newData.description || undefined,
        icon: newData.icon,
        color: newData.color,
        organization_id: organizationId,
      },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewData({ display_name: '', description: '', icon: 'Star', color: 'blue' });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Responsibilities</h3>
          <p className="text-sm text-muted-foreground">
            Leadership and specialty designations that can be assigned to team members
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)} disabled={showCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Responsibility
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="border-primary/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">New Responsibility</CardTitle>
            <CardDescription>Create a new leadership or specialty designation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Display Name (e.g. Culture Leader)"
              value={newData.display_name}
              onChange={(e) => setNewData(prev => ({ ...prev, display_name: e.target.value }))}
            />
            <Textarea
              placeholder="Description of what this responsibility entails"
              value={newData.description}
              onChange={(e) => setNewData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Icon</label>
              <RoleIconPicker value={newData.icon} onChange={(icon) => setNewData(prev => ({ ...prev, icon }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <RoleColorPicker value={newData.color} onChange={(color) => setNewData(prev => ({ ...prev, color }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newData.display_name.trim() || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Responsibilities */}
      {activeResponsibilities.length === 0 && !showCreate ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No responsibilities defined yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activeResponsibilities.map(resp => (
            <ResponsibilityCard
              key={resp.id}
              responsibility={resp}
              canManage={canManage}
              onUpdate={(id, data) => updateMutation.mutate({ id, data })}
              onArchive={(id) => archiveMutation.mutate(id)}
              onRestore={(id) => restoreMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Archived Toggle */}
      {archivedResponsibilities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch checked={showArchived} onCheckedChange={setShowArchived} id="show-archived-resp" />
            <Label htmlFor="show-archived-resp" className="text-sm text-muted-foreground">
              Show archived ({archivedResponsibilities.length})
            </Label>
          </div>
          {showArchived && (
            <div className="space-y-2">
              {archivedResponsibilities.map(resp => (
                <ResponsibilityCard
                  key={resp.id}
                  responsibility={resp}
                  canManage={canManage}
                  onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                  onArchive={(id) => archiveMutation.mutate(id)}
                  onRestore={(id) => restoreMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
