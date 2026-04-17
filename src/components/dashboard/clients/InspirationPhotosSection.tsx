import { useState } from 'react';
import { format } from 'date-fns';
import { Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useClientInspirationPhotos } from '@/hooks/useClientInspirationPhotos';

interface InspirationPhotosSectionProps {
  clientId: string | null | undefined;
}

/**
 * Read-only display of inspiration photos the client uploaded with their booking inquiry.
 * Renders nothing when no photos exist (no empty-state noise).
 *
 * Surface: Appointment Photos tab, above TransformationTimeline.
 * Management of these photos lives in the Lead Inbox — this is purely advisory context for the chair.
 */
export function InspirationPhotosSection({ clientId }: InspirationPhotosSectionProps) {
  const { data: photos = [], isLoading } = useClientInspirationPhotos(clientId);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (isLoading) return null;
  if (!photos || photos.length === 0) return null;

  return (
    <section className="mb-6">
      <header className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-display text-xs tracking-wider uppercase text-foreground">
          Inspiration from Booking Inquiry
        </h3>
        <span className="text-xs text-muted-foreground font-sans">
          ({photos.length})
        </span>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => photo.signed_url && setLightboxUrl(photo.signed_url)}
            className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted hover:border-primary/50 transition-colors"
          >
            {photo.signed_url ? (
              <img
                src={photo.signed_url}
                alt={photo.file_name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-sans">
                Unavailable
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-[10px] font-sans text-white/90 leading-tight">
                {format(new Date(photo.uploaded_at), 'MMM d, yyyy')}
              </p>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-0 bg-background border-border">
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Inspiration photo"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
