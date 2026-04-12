import { useState } from 'react';
import { BookingPublishBar } from './BookingPublishBar';
import { BookingSurfaceModeSelector } from './BookingSurfaceModeSelector';
import { BookingThemeEditor } from './BookingThemeEditor';
import { BookingFlowConfigurator } from './BookingFlowConfigurator';
import { BookingHostedPageEditor } from './BookingHostedPageEditor';
import { BookingLivePreview } from './BookingLivePreview';
import { BookingLinkConfigurator } from './BookingLinkConfigurator';
import { EmbedCodeGenerator } from './EmbedCodeGenerator';
import {
  useBookingSurfaceConfig,
  useUpdateBookingSurfaceConfig,
  DEFAULT_BOOKING_SURFACE_CONFIG,
  type BookingSurfaceConfig,
} from '@/hooks/useBookingSurfaceConfig';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function BookingSurfaceSettings() {
  const { data: config, isLoading } = useBookingSurfaceConfig();
  const updateConfig = useUpdateBookingSurfaceConfig();
  const { effectiveOrganization } = useOrganizationContext();

  const effectiveConfig = config ?? DEFAULT_BOOKING_SURFACE_CONFIG;
  const orgSlug = effectiveConfig.slug || effectiveOrganization?.slug || '';
  const bookingUrl = `${window.location.origin}/book/${orgSlug}`;

  const handleSave = async (partial: Partial<BookingSurfaceConfig>) => {
    const merged = { ...effectiveConfig, ...partial };
    try {
      await updateConfig.mutateAsync(merged);
      toast.success('Booking surface settings saved');
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showEmbed = effectiveConfig.mode === 'embed' || effectiveConfig.mode === 'both';
  const showHosted = effectiveConfig.mode === 'hosted' || effectiveConfig.mode === 'both';

  return (
    <div className="flex gap-6">
      {/* Left: Settings */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Mode Selector */}
        <BookingSurfaceModeSelector
          mode={effectiveConfig.mode}
          onChange={(mode) => handleSave({ mode })}
        />

        {/* Theme Editor */}
        <BookingThemeEditor
          theme={effectiveConfig.theme}
          onChange={(theme) => handleSave({ theme })}
        />

        {/* Flow Configurator */}
        <BookingFlowConfigurator
          flow={effectiveConfig.flow}
          onChange={(flow) => handleSave({ flow })}
        />

        {/* Hosted Page Settings */}
        {showHosted && (
          <BookingHostedPageEditor
            hosted={effectiveConfig.hosted}
            slug={effectiveConfig.slug}
            onChange={(hosted) => handleSave({ hosted })}
            onSlugChange={(slug) => handleSave({ slug })}
          />
        )}

        {/* Deep Links */}
        <BookingLinkConfigurator bookingUrl={bookingUrl} />

        {/* Embed Code Generator */}
        {showEmbed && (
          <EmbedCodeGenerator bookingUrl={bookingUrl} />
        )}
      </div>

      {/* Right: Live Preview (sticky) */}
      <div className="hidden xl:block w-[420px] shrink-0">
        <BookingLivePreview config={effectiveConfig} />
      </div>

      {/* Sticky Publish Bar */}
      <BookingPublishBar
        config={effectiveConfig}
        onSave={handleSave}
        isSaving={updateConfig.isPending}
      />
    </div>
  );
}
