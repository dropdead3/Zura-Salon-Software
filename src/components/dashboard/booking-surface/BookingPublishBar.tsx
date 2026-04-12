import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Globe } from 'lucide-react';
import { toast } from 'sonner';
import type { BookingSurfaceConfig } from '@/hooks/useBookingSurfaceConfig';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

interface BookingPublishBarProps {
  config: BookingSurfaceConfig;
  onSave: (partial: Partial<BookingSurfaceConfig>) => Promise<void>;
}

export function BookingPublishBar({ config, onSave }: BookingPublishBarProps) {
  const { effectiveOrganization } = useOrganizationContext();
  const orgSlug = effectiveOrganization?.slug || '';
  const bookingUrl = `${window.location.origin}/book/${orgSlug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast.success('Booking link copied');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="font-display text-base tracking-wide">BOOKING SURFACE</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {config.published ? 'Published' : 'Unpublished'}
            </span>
            <Switch
              checked={config.published}
              onCheckedChange={(published) => onSave({ published })}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Input
            value={bookingUrl}
            readOnly
            className="font-mono text-sm flex-1"
          />
          <Button variant="outline" size="icon" onClick={handleCopy}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" asChild>
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
