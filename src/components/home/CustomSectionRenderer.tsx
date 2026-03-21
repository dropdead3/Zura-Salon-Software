import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { CustomSectionType } from '@/hooks/useWebsiteSections';

interface CustomSectionRendererProps {
  sectionId: string;
  sectionType: CustomSectionType;
}

export function CustomSectionRenderer({ sectionId, sectionType }: CustomSectionRendererProps) {
  const settingsKey = `section_custom_${sectionId}`;

  const { data: config } = useQuery({
    queryKey: ['site-settings', settingsKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', settingsKey)
        .maybeSingle();
      if (error) throw error;
      return data?.value as Record<string, unknown> | null;
    },
  });

  if (!config) return null;

  switch (sectionType) {
    case 'rich_text': {
      const bg = config.background === 'muted' ? 'bg-muted' : config.background === 'primary' ? 'bg-primary/5' : '';
      return (
        <section className={cn('py-16 px-4', bg)}>
          <div className={cn('max-w-3xl mx-auto', `text-${config.alignment || 'center'}`)}>
            {config.heading && <h2 className="text-3xl font-display font-medium mb-4">{config.heading as string}</h2>}
            {config.body && <p className="text-muted-foreground whitespace-pre-line">{config.body as string}</p>}
          </div>
        </section>
      );
    }

    case 'image_text': {
      const isRight = config.layout === 'image-right';
      return (
        <section className="py-16 px-4">
          <div className={cn('max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center', isRight && 'direction-rtl')}>
            <div className={isRight ? 'order-2 md:order-1' : ''}>
              {config.heading && <h2 className="text-3xl font-display font-medium mb-4">{config.heading as string}</h2>}
              {config.body && <p className="text-muted-foreground mb-6">{config.body as string}</p>}
              {config.button_text && config.button_url && (
                <Button asChild>
                  <a href={config.button_url as string}>{config.button_text as string}</a>
                </Button>
              )}
            </div>
            <div className={isRight ? 'order-1 md:order-2' : ''}>
              {config.image_url && (
                <img src={config.image_url as string} alt={config.heading as string || 'Section image'} className="rounded-xl w-full object-cover" />
              )}
            </div>
          </div>
        </section>
      );
    }

    case 'video': {
      const url = config.video_url as string;
      let embedUrl = '';
      if (url?.includes('youtube.com') || url?.includes('youtu.be')) {
        const id = url.includes('youtu.be') ? url.split('/').pop() : new URLSearchParams(url.split('?')[1]).get('v');
        embedUrl = `https://www.youtube.com/embed/${id}${config.autoplay ? '?autoplay=1&mute=1' : ''}`;
      } else if (url?.includes('vimeo.com')) {
        const id = url.split('/').pop();
        embedUrl = `https://player.vimeo.com/video/${id}${config.autoplay ? '?autoplay=1&muted=1' : ''}`;
      }
      return (
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            {config.heading && <h2 className="text-3xl font-display font-medium mb-6 text-center">{config.heading as string}</h2>}
            {embedUrl && (
              <div className="aspect-video rounded-xl overflow-hidden">
                <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="autoplay" />
              </div>
            )}
          </div>
        </section>
      );
    }

    case 'custom_cta': {
      const variant = config.variant as string;
      const bgClass = variant === 'primary' ? 'bg-primary text-primary-foreground' : variant === 'dark' ? 'bg-foreground text-background' : 'bg-muted';
      return (
        <section className={cn('py-16 px-4', bgClass)}>
          <div className="max-w-3xl mx-auto text-center">
            {config.heading && <h2 className="text-3xl font-display font-medium mb-3">{config.heading as string}</h2>}
            {config.description && <p className="mb-6 opacity-80">{config.description as string}</p>}
            {config.button_text && config.button_url && (
              <Button variant={variant === 'primary' ? 'secondary' : 'default'} asChild>
                <a href={config.button_url as string}>{config.button_text as string}</a>
              </Button>
            )}
          </div>
        </section>
      );
    }

    case 'spacer': {
      return (
        <div style={{ height: `${config.height || 64}px` }} className="flex items-center justify-center">
          {config.show_divider && <Separator className="max-w-lg" />}
        </div>
      );
    }

    default:
      return null;
  }
}
