import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookingPublishBar } from './BookingPublishBar';
import { BookingThemeEditor } from './BookingThemeEditor';
import { BookingFlowConfigurator } from './BookingFlowConfigurator';
import { BookingHostedPageEditor } from './BookingHostedPageEditor';
import {
  useBookingSurfaceConfig,
  useUpdateBookingSurfaceConfig,
  DEFAULT_BOOKING_SURFACE_CONFIG,
  type BookingSurfaceConfig,
} from '@/hooks/useBookingSurfaceConfig';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function BookingSurfaceSettings() {
  const { data: config, isLoading } = useBookingSurfaceConfig();
  const updateConfig = useUpdateBookingSurfaceConfig();

  const effectiveConfig = config ?? DEFAULT_BOOKING_SURFACE_CONFIG;

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

  return (
    <div className="space-y-6">
      <BookingPublishBar config={effectiveConfig} onSave={handleSave} />

      <Tabs defaultValue="theme" className="w-full">
        <TabsList>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="flow">Booking Flow</TabsTrigger>
          <TabsTrigger value="hosted">Hosted Page</TabsTrigger>
        </TabsList>

        <TabsContent value="theme" className="mt-6">
          <BookingThemeEditor
            theme={effectiveConfig.theme}
            onChange={(theme) => handleSave({ theme })}
          />
        </TabsContent>

        <TabsContent value="flow" className="mt-6">
          <BookingFlowConfigurator
            flow={effectiveConfig.flow}
            onChange={(flow) => handleSave({ flow })}
          />
        </TabsContent>

        <TabsContent value="hosted" className="mt-6">
          <BookingHostedPageEditor
            hosted={effectiveConfig.hosted}
            onChange={(hosted) => handleSave({ hosted })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
