import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
  isPending: boolean;
  initialName?: string;
  mode: 'create' | 'rename';
  existingCategories?: string[];
}

function isSimilar(a: string, b: string): boolean {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return true;
  // Plural detection
  if (la + 's' === lb || lb + 's' === la) return true;
  if (la + 'es' === lb || lb + 'es' === la) return true;
  // Substring check
  if (la.length > 3 && lb.length > 3 && (la.includes(lb) || lb.includes(la))) return true;
  return false;
}

export function CategoryFormDialog({ open, onOpenChange, onSubmit, isPending, initialName, mode, existingCategories = [] }: CategoryFormDialogProps) {
  const [name, setName] = useState(initialName || '');

  useEffect(() => {
    if (open) setName(initialName || '');
  }, [open, initialName]);

  const similarWarning = useMemo(() => {
    if (!name.trim()) return null;
    const match = existingCategories.find(
      existing => existing !== initialName && isSimilar(name.trim(), existing)
    );
    return match || null;
  }, [name, existingCategories, initialName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New Category' : 'Rename Category'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Add a new service category for organizing your menu.'
              : 'Update the category name.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hair Color, Nails, Skincare"
              autoFocus
            />
            {similarWarning && (
              <div className="flex items-center gap-1.5 text-amber-600 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Similar to existing category "{similarWarning}"</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
