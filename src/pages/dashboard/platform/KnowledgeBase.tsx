import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PlatformPageContainer } from '@/components/platform/ui/PlatformPageContainer';
import { PlatformPageHeader } from '@/components/platform/ui/PlatformPageHeader';
import { PlatformButton } from '@/components/platform/ui/PlatformButton';
import { KBCategoryManager } from '@/components/platform/settings/KBCategoryManager';
import { KBArticlesList } from '@/components/platform/settings/KBArticlesList';
import { KBArticleEditor } from '@/components/platform/settings/KBArticleEditor';
import { useAdminKBArticles, KBArticle } from '@/hooks/useKnowledgeBase';

export default function KnowledgeBase() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KBArticle | null>(null);
  const { data: articles } = useAdminKBArticles();

  const handleNewArticle = () => {
    setEditingArticle(null);
    setIsEditorOpen(true);
  };

  const handleEditArticle = (article: KBArticle) => {
    setEditingArticle(article);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingArticle(null);
  };

  const publishedCount = articles?.filter(a => a.status === 'published').length || 0;
  const draftCount = articles?.filter(a => a.status === 'draft').length || 0;

  return (
    <PlatformPageContainer className="space-y-6">
      <PlatformPageHeader
        title="Knowledge Base"
        description={`Manage help articles for all accounts • ${publishedCount} published, ${draftCount} drafts`}
        actions={
          <PlatformButton onClick={handleNewArticle} className="gap-2">
            <Plus className="h-4 w-4" />
            New Article
          </PlatformButton>
        }
      />

      <div className="space-y-8">
        <KBCategoryManager />
        <KBArticlesList onEditArticle={handleEditArticle} />
      </div>

      <KBArticleEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        article={editingArticle}
        onClose={handleCloseEditor}
      />
    </PlatformPageContainer>
  );
}
