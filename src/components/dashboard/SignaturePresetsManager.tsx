import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSignaturePresets, SignaturePreset, SignatureConfig } from '@/hooks/useSignaturePresets';
import { Pencil, Trash2, User, PenTool, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const SignaturePresetsManager: React.FC = () => {
  const { presets, isLoading, updatePreset, deletePreset } = useSignaturePresets();
  const [editingPreset, setEditingPreset] = useState<SignaturePreset | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEditClick = (preset: SignaturePreset) => {
    setEditingPreset(preset);
    setEditName(preset.name);
  };

  const handleSaveEdit = () => {
    if (!editingPreset || !editName.trim()) return;
    
    updatePreset.mutate({
      id: editingPreset.id,
      name: editName.trim(),
      config: editingPreset.config,
    }, {
      onSuccess: () => setEditingPreset(null),
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return;
    deletePreset.mutate(deleteConfirmId, {
      onSuccess: () => setDeleteConfirmId(null),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Signature Presets
          </CardTitle>
          <CardDescription>Manage saved signature block presets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Signature Presets
          </CardTitle>
          <CardDescription>
            Manage saved signature block presets. Create new presets from the email template editor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {presets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PenTool className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No signature presets saved yet.</p>
              <p className="text-xs mt-1">Create one from the email template editor.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {preset.config.imageUrl ? (
                      <img
                        src={preset.config.imageUrl}
                        alt={preset.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{preset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {preset.config.name || 'No name set'}
                        {preset.config.title && ` • ${preset.config.title}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditClick(preset)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(preset.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingPreset} onOpenChange={(open) => !open && setEditingPreset(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Preset Name</DialogTitle>
            <DialogDescription>
              Update the name for this signature preset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., Kristi Day - CEO"
              />
            </div>
            {editingPreset?.config.imageUrl && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <img
                  src={editingPreset.config.imageUrl}
                  alt="Preview"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="text-sm">
                  <p className="font-medium">{editingPreset.config.name}</p>
                  <p className="text-muted-foreground">{editingPreset.config.title}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPreset(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={!editName.trim() || updatePreset.isPending}
            >
              {updatePreset.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Signature Preset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this signature preset. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePreset.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
