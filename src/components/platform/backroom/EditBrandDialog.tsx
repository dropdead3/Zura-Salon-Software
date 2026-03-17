import { useState, useRef } from 'react';
import { Image as ImageIcon, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  PlatformDialogContent as DialogContent,
  DialogHeader,
  PlatformDialogTitle as DialogTitle,
  DialogFooter,
  PlatformDialogDescription as DialogDescription,
} from '@/components/platform/ui/PlatformDialog';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { PlatformInput } from '@/components/platform/ui/PlatformInput';
import { PlatformLabel } from '@/components/platform/ui/PlatformLabel';
import { useUpdateSupplyBrand, useCreateSupplyBrand, uploadBrandLogo } from '@/hooks/platform/useSupplyLibraryBrandMeta';

interface EditBrandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string | null;
  brandName: string;
  brandLogoUrl: string | null;
  onBrandRenamed?: (newName: string) => void;
}

export function EditBrandDialog({
  open,
  onOpenChange,
  brandId,
  brandName,
  brandLogoUrl,
  onBrandRenamed,
}: EditBrandDialogProps) {
  const [name, setName] = useState(brandName);
  const [logoUrl, setLogoUrl] = useState<string | null>(brandLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const updateBrand = useUpdateSupplyBrand();
  const createBrand = useCreateSupplyBrand();

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setName(brandName);
      setLogoUrl(brandLogoUrl);
    }
    onOpenChange(v);
  };

  const handleFile = async (file: File) => {
    const valid = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'];
    if (!valid.includes(file.type) || file.size > 2 * 1024 * 1024) return;
    setUploading(true);
    const url = await uploadBrandLogo(file, name || brandName);
    if (url) setLogoUrl(url);
    setUploading(false);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (brandId) {
      // Update existing meta row
      updateBrand.mutate(
        {
          id: brandId,
          name: trimmed !== brandName ? trimmed : undefined,
          logo_url: logoUrl !== brandLogoUrl ? logoUrl : undefined,
          originalName: brandName,
        },
        {
          onSuccess: () => {
            if (trimmed !== brandName) onBrandRenamed?.(trimmed);
            onOpenChange(false);
          },
        },
      );
    } else {
      // No meta row exists — create one
      createBrand.mutate(
        {
          name: trimmed,
          logo_url: logoUrl || undefined,
        },
        {
          onSuccess: () => {
            if (trimmed !== brandName) onBrandRenamed?.(trimmed);
            onOpenChange(false);
          },
        },
      );
    }
  };

  const hasChanges = name.trim() !== brandName || logoUrl !== brandLogoUrl;
  const isPending = updateBrand.isPending || createBrand.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Brand</DialogTitle>
          <DialogDescription>Update the brand name or logo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <PlatformLabel>Brand Name</PlatformLabel>
            <PlatformInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Brand name"
            />
          </div>

          <div className="space-y-1.5">
            <PlatformLabel>Logo</PlatformLabel>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            {logoUrl ? (
              <div className="relative w-20 h-20 rounded-lg border border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.5)] flex items-center justify-center p-1">
                <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                <button
                  onClick={() => setLogoUrl(null)}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={cn(
                  'cursor-pointer w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all',
                  isDragging
                    ? 'border-[hsl(var(--platform-primary))] bg-[hsl(var(--platform-primary)/0.1)]'
                    : 'border-[hsl(var(--platform-border))] hover:border-[hsl(var(--platform-border)/0.8)] bg-[hsl(var(--platform-bg-card)/0.3)]',
                )}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 text-[hsl(var(--platform-primary))] animate-spin" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-[hsl(var(--platform-foreground-subtle))]" />
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <PlatformButton variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </PlatformButton>
          <PlatformButton
            size="sm"
            onClick={handleSave}
            loading={isPending}
            disabled={!hasChanges || !name.trim()}
          >
            Save Changes
          </PlatformButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
