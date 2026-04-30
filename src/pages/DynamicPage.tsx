import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { SEO } from '@/components/SEO';
import { useWebsitePages, getPageBySlug } from '@/hooks/useWebsitePages';
import { PageSectionRenderer } from '@/components/home/PageSectionRenderer';
import { SectionStyleWrapper } from '@/components/home/SectionStyleWrapper';

export default function DynamicPage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const { data: pagesConfig, isLoading } = useWebsitePages();

  const page = useMemo(() => {
    return getPageBySlug(pagesConfig, pageSlug || '', isPreview);
  }, [pagesConfig, pageSlug, isPreview]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!page) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-4xl font-display font-medium mb-2">404</h1>
            <p className="text-muted-foreground">Page not found</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO
        title={page.seo_title || page.title}
        description={page.seo_description}
      />
      {/* Page-level style overrides — driven by chip rail in Page Settings. */}
      <SectionStyleWrapper styleOverrides={page.style_overrides}>
        <PageSectionRenderer sections={page.sections} pageId={page.id} />
      </SectionStyleWrapper>
    </Layout>
  );
}
