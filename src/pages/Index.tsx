import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { useWebsitePages } from "@/hooks/useWebsitePages";
import { PageSectionRenderer } from "@/components/home/PageSectionRenderer";
import { SectionStyleWrapper } from "@/components/home/SectionStyleWrapper";
import { PlacementScopeProvider } from "@/components/home/PlacementScopeContext";

const Index = () => {
  const { data: pagesConfig } = useWebsitePages();
  const homePage = pagesConfig?.pages.find(p => p.id === 'home');

  return (
    <Layout>
      <SEO 
        title="Premier Hair Salon in Mesa & Gilbert, Arizona"
        description="Premier destination for expert hair color, extensions, cutting & styling. Book your transformation today."
        type="local_business"
      />
      {/* Page-level style overrides — driven by chip rail in Page Settings. */}
      <PlacementScopeProvider scope="homepage">
        <SectionStyleWrapper styleOverrides={homePage?.style_overrides}>
          <PageSectionRenderer sections={homePage?.sections ?? []} pageId="home" />
        </SectionStyleWrapper>
      </PlacementScopeProvider>
    </Layout>
  );
};

export default Index;
