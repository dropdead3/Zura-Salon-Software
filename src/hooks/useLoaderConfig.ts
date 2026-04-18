import { usePlatformBranding } from '@/hooks/usePlatformBranding';

export type LoaderStyle = 'luxe' | 'zura' | 'spinner' | 'dots' | 'bar';

export interface LoaderConfig {
  loaderStyle: LoaderStyle;
  useSkeletons: boolean;
}

export function useLoaderConfig(): LoaderConfig {
  const { branding } = usePlatformBranding();

  return {
    loaderStyle: (branding.loader_style as LoaderStyle) || 'luxe',
    useSkeletons: branding.use_skeleton_loaders ?? false,
  };
}
