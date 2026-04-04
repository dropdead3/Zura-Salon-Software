import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSignaturePresets, SignatureConfig } from '@/hooks/useSignaturePresets';
import { Save, FolderOpen, Loader2, User, ChevronDown } from 'lucide-react';
import { tokens } from '@/lib/design-tokens';

interface SignaturePresetActionsProps {
  config: SignatureConfig;
  onLoadPreset: (config: SignatureConfig) => void;
}

export const SignaturePresetActions: React.FC<SignaturePresetActionsProps> = ({
  config,
  onLoadPreset,
}) => {
  const { presets, isLoading, createPreset } = useSignaturePresets();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleSave = () => {
    if (!presetName.trim()) return;
    createPreset.mutate(
      { name: presetName.trim(), config },
      { onSuccess: () => { setSaveDialogOpen(false); setPresetName(''); } }
    );
  };

  return (
    <div className="flex items-center gap-2 pb-3 border-b border-border mb-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={tokens.button.card} className="flex-1 gap-1.5" disabled={isLoading}>
            <FolderOpen className="h-3.5 w-3.5" />
            Load Preset
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {presets.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              No presets saved yet
            </div>
          ) : (
            presets.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                onClick={() => onLoadPreset(preset.config)}
                className="gap-2"
              >
                {preset.config.imageUrl ? (
                  <img src={preset.config.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
                <span className="truncate">{preset.name}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="outline" size={tokens.button.card} className="flex-1 gap-1.5" onClick={() => setSaveDialogOpen(true)}>
        <Save className="h-3.5 w-3.5" />
        Save Preset
      </Button>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Signature Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Preset Name</Label>
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Jane Smith - Owner"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!presetName.trim() || createPreset.isPending}>
              {createPreset.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
