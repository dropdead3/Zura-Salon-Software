import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { SEOPageHealthBadge } from '@/components/dashboard/seo-workshop/SEOPageHealthBadge';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Paintbrush } from 'lucide-react';
import { AddSectionDialog } from '@/components/dashboard/website-editor/AddSectionDialog';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PageExplainer } from '@/components/ui/PageExplainer';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';

const HeroEditor = lazy(() => import('@/components/dashboard/website-editor/HeroEditor').then(m => ({ default: m.HeroEditor })));
const TestimonialsEditor = lazy(() => import('@/components/dashboard/website-editor/TestimonialsEditor').then(m => ({ default: m.TestimonialsEditor })));
const FAQEditor = lazy(() => import('@/components/dashboard/website-editor/FAQEditor').then(m => ({ default: m.FAQEditor })));
const GalleryDisplayEditor = lazy(() => import('@/components/dashboard/website-editor/GalleryDisplayEditor').then(m => ({ default: m.GalleryDisplayEditor })));
const CustomSectionEditor = lazy(() => import('@/components/dashboard/website-editor/CustomSectionEditor').then(m => ({ default: m.CustomSectionEditor })));

const COMPONENT_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  hero: HeroEditor,
  testimonials: TestimonialsEditor,
  faq: FAQEditor,
  gallery: GalleryDisplayEditor,
};

export default function WebsiteSectionsHub() {
  const { effectiveOrganization } = useOrganizationContext();
  const organizationId = effectiveOrganization?.id;
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMobile = useIsMobile();
  const [showMobileInspector, setShowMobileInspector] = useState(false);
  
  const queryClient = useQueryClient();

  const fetchSections = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('website_sections' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true }) as any);

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      toast.error('Failed to load website sections');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchSections();
    }
  }, [organizationId, fetchSections]);

  const handleSectionSelect = (section: any) => {
    if (isSaving) return;
    setSelectedSection(section);
  };

  const handleSave = async (newContent: any) => {
    setIsSaving(true);
    try {
      const { error } = await (supabase
        .from('website_sections' as any)
        .update({ content: newContent })
        .eq('id', selectedSection.id) as any);

      if (error) throw error;
      toast.success('Section saved');
      setSelectedSection({ ...selectedSection, content: newContent });
      triggerPreviewRefresh();
    } catch (error) {
      toast.error('Failed to save section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSection = async (component: string) => {
    if (!organizationId) return;
    setIsAdding(true);
    try {
      const maxSortOrderResult = await (supabase
        .from('website_sections' as any)
        .select('sort_order')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single() as any);

      const maxSortOrder = maxSortOrderResult.data?.sort_order || 0;

      const { error } = await (supabase
        .from('website_sections' as any)
        .insert({
          organization_id: organizationId,
          component,
          sort_order: maxSortOrder + 1,
        }) as any);

      if (error) throw error;
      toast.success('Section added');
      fetchSections();
    } catch (error) {
      toast.error('Failed to add section');
    } finally {
      setIsAdding(false);
      setSelectedSection(null);
    }
  };

  const handleDeleteSection = async () => {
    if (!selectedSection) return;
    setIsDeleting(true);
    try {
      const { error } = await (supabase
        .from('website_sections' as any)
        .delete()
        .eq('id', selectedSection.id) as any);

      if (error) throw error;
      toast.success('Section deleted');
      setSelectedSection(null);
      fetchSections();
    } catch (error) {
      toast.error('Failed to delete section');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReorder = async (event: any) => {
    // Reorder logic placeholder
  };

  const EditorComponent = selectedSection?.component 
    ? COMPONENT_MAP[selectedSection.component] || CustomSectionEditor 
    : null;

  return (
    <DashboardLayout>
      <DashboardPageHeader title="Website Sections" />
        <PageExplainer pageId="website-hub" />
      
      <div className="container max-w-[1600px] px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sections List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm tracking-wide uppercase">Sections</h3>
              <Button size="sm" onClick={() => setIsAdding(true)}>Add Section</Button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className={cn("animate-pulse rounded-xl bg-muted h-16 w-full")} />
                ))}
              </div>
            ) : sections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Paintbrush className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No sections yet</p>
              </div>
            ) : (
              sections.map((section) => (
                <Card 
                  key={section.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    selectedSection?.id === section.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleSectionSelect(section)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{section.component}</p>
                      <p className="text-xs text-muted-foreground">Sort: {section.sort_order}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SEOPageHealthBadge
                        organizationId={organizationId}
                        objectKey={`page::${section.component}`}
                      />
                      <Badge variant="secondary" className="text-xs">{section.component}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Editor Panel */}
          <div className="lg:col-span-2">
            {selectedSection ? (
              <Card className="p-6">
                <p className="font-medium mb-4">Editing: {selectedSection.component}</p>
                <p className="text-sm text-muted-foreground">Section editor for type "{selectedSection.component}"</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="destructive" size="sm" onClick={handleDeleteSection} disabled={isDeleting}>
                    Delete Section
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Select a section to edit
              </div>
            )}
          </div>
        </div>

        {/* Mobile Inspector Panel */}
        {isMobile && selectedSection && (
          <PremiumFloatingPanel
            open={showMobileInspector}
            onOpenChange={setShowMobileInspector}
            side="bottom"
            maxHeight="85vh"
          >
            <div className="p-5">
              <p className="font-medium">Editing: {selectedSection.component}</p>
            </div>
          </PremiumFloatingPanel>
        )}
      </div>
    </DashboardLayout>
  );
}
