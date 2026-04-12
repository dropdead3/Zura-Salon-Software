import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Globe, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { BookingSurfaceConfig } from '@/hooks/useBookingSurfaceConfig';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface BookingPublishBarProps {
  config: BookingSurfaceConfig;
  onSave: (partial: Partial<BookingSurfaceConfig>) => Promise<void>;
  isSaving?: boolean;
}

export function BookingPublishBar({ config, onSave, isSaving }: BookingPublishBarProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgSlug = config.slug || effectiveOrganization?.slug || '';
  const bookingUrl = `${window.location.origin}/book/${orgSlug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast.success('Booking link copied');
  };

  return (
    <div className="sticky bottom-0 z-10">
      <Card className="border-t-2 border-primary/20 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left: status */}
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${config.published ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-sm font-medium text-foreground">
                {config.published ? 'Published' : 'Draft'}
              </span>
              <Switch
                checked={config.published}
                onCheckedChange={(published) => onSave({ published })}
              />
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
