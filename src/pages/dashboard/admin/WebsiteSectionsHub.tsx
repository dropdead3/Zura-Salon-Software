import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, FilterTabsList, FilterTabsTrigger } from '@/components/ui/tabs';
import { Paintbrush } from 'lucide-react';
import { AddSectionDialog } from '@/components/dashboard/website-editor/AddSectionDialog';
import { StructurePanelSkeleton, CanvasPanelSkeleton, InspectorPanelSkeleton } from '@/components/dashboard/website-editor/EditorSkeletons';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';

import { HeroEditor } from '@/components/dashboard/website-editor/HeroEditor';
import { FeaturesEditor } from '@/components/dashboard/website-editor/FeaturesEditor';
import { TestimonialsEditor } from '@/components/dashboard/website-editor/TestimonialsEditor';
import { PricingEditor } from '@/components/dashboard/website-editor/PricingEditor';
import { ContactEditor } from '@/components/dashboard/website-editor/ContactEditor';
import { GalleryEditor } from '@/components/dashboard/website-editor/GalleryEditor';
import { TeamEditor } from '@/components/dashboard/website-editor/TeamEditor';
import { FaqEditor } from '@/components/dashboard/website-editor/FaqEditor';
import { NewsletterEditor } from '@/components/dashboard/website-editor/NewsletterEditor';
import { BasicTextEditor } from '@/components/dashboard/website-editor/BasicTextEditor';
import { ImageWithTextEditor } from '@/components/dashboard/website-editor/ImageWithTextEditor';
import { VideoWithTextEditor } from '@/components/dashboard/website-editor/VideoWithTextEditor';
import { CtaEditor } from '@/components/dashboard/website-editor/CtaEditor';
import { MapEditor } from '@/components/dashboard/website-editor/MapEditor';

import { StructurePanel, type StructureMode } from '@/components/dashboard/website-editor/panels/StructurePanel';
import { CanvasPanel } from '@/components/dashboard/website-editor/panels/CanvasPanel';
import { InspectorPanel } from '@/components/dashboard/website-editor/panels/InspectorPanel';

const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  hero: HeroEditor,
  features: FeaturesEditor,
  testimonials: TestimonialsEditor,
  pricing: PricingEditor,
  contact: ContactEditor,
  gallery: GalleryEditor,
  team: TeamEditor,
  faq: FaqEditor,
  newsletter: NewsletterEditor,
  basic_text: BasicTextEditor,
  image_with_text: ImageWithTextEditor,
  video_with_text: VideoWithTextEditor,
  cta: CtaEditor,
  map: MapEditor,
};

export default function WebsiteSectionsHub() {
  const { organizationId } = useOrganizationContext();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [structureMode, setStructureMode] = useState<StructureMode>('list');
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [showMobileInspector, setShowMobileInspector] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  
  const queryClient = useQueryClient();

  const fetchSections = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('website_sections')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true });

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
    if (isSaving) {
      setShowUnsavedDialog(true);
      return;
    }
    setSelectedSection(section);
    setSelectedComponent(section.component);
  };

  const handleSave = async (newContent: any) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('website_sections')
        .update({ content: newContent })
        .eq('id', selectedSection.id);

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
    setIsAdding(true);
    try {
      const maxSortOrderResult = await supabase
        .from('website_sections')
        .select('sort_order')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const maxSortOrder = maxSortOrderResult.data?.sort_order || 0;

      const { error } = await supabase
        .from('website_sections')
        .insert({
          organization_id: organizationId,
          component,
          sort_order: maxSortOrder + 1,
        });

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
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('website_sections')
        .delete()
        .eq('id', selectedSection.id);

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

  const handleSortEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id === over.id) return;

    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);

    const reorderedSections = [...sections];
    reorderedSections.splice(newIndex, 0, reorderedSections.splice(oldIndex, 1)[0]);

    // Update sort orders in database
    try {
      const updates = reorderedSections.map((section, index) => ({
        id: section.id,
        sort_order: index + 1,
      }));

      const { error } = await supabase.from('website_sections').upsert(updates);
      if (error) throw error;

      setSections(reorderedSections);
      queryClient.invalidateQueries(['website_sections']);
      triggerPreviewRefresh();
    } catch (error) {
      toast.error('Failed to reorder sections');
    }
  };

  const renderEditor = () => {
    const ComponentEditor = COMPONENT_MAP[selectedComponent];
    if (!ComponentEditor) {
      return <div className="text-muted-foreground">No editor for this component</div>;
    }

    return (
      <ComponentEditor
        section={selectedSection}
        onSave={handleSave}
        isSaving={isSaving}
      />
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)] overflow-hidden bg-background">
      {/* Structure Panel */}
      <StructurePanel
        sections={sections}
        loading={loading}
        selectedSection={selectedSection}
        onSectionSelect={handleSectionSelect}
        onSortEnd={handleSortEnd}
        onAddClick={() => setIsAdding(true)}
        onDeleteClick={() => setShowUnsavedDialog(true)}
        structureMode={structureMode}
        setStructureMode={setStructureMode}
      />

      {/* Canvas Panel */}
      <CanvasPanel
        selectedSection={selectedSection}
        loading={loading}
        renderEditor={renderEditor}
        isSaving={isSaving}
        isMobile={isMobile}
        setShowMobileInspector={setShowMobileInspector}
      />

      {/* Inspector Panel - Desktop */}
      {!isMobile && (
        <InspectorPanel
          selectedSection={selectedSection}
          renderEditor={renderEditor}
          isSaving={isSaving}
        />
      )}

      {/* Inspector Panel - Mobile Bottom Sheet */}
      {isMobile && (
        <PremiumFloatingPanel 
          open={showMobileInspector} 
          onOpenChange={setShowMobileInspector}
          side="bottom"
          maxHeight="80vh"
          maxWidth="100%"
          showCloseButton
        >
          <div className="p-4 pb-2 border-b border-border/40">
            <h2 className="text-sm font-sans font-medium">
              Inspector
            </h2>
          </div>
          <ScrollArea className="flex-1 px-4 pb-4">
            {renderEditor()}
          </ScrollArea>
        </PremiumFloatingPanel>
      )}

      {/* Add Section Dialog */}
      <AddSectionDialog
        open={isAdding}
        onOpenChange={setIsAdding}
        onAdd={handleAddSection}
        isLoading={isAdding}
      />

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setShowUnsavedDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowUnsavedDialog(false);
                setSelectedSection(null);
              }}
            >
              Discard
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
