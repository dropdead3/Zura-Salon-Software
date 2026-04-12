import { useState } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { PlatformButton } from '../ui/PlatformButton';
import {
  PlatformCard,
  PlatformCardContent,
  PlatformCardHeader,
  PlatformCardTitle,
  PlatformCardDescription,
} from '../ui/PlatformCard';
import { KBCategoryManager } from './KBCategoryManager';
import { KBArticlesList } from './KBArticlesList';
import { KBArticleEditor } from './KBArticleEditor';
import { useAdminKBArticles, KBArticle } from '@/hooks/useKnowledgeBase';

export function KnowledgeBaseTab() {
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
    <div className="space-y-6">
      <PlatformCard variant="glass" size="container">
        <PlatformCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <PlatformCardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-violet-400" />
                Knowledge Base
              </PlatformCardTitle>
              <PlatformCardDescription>
                Manage help articles for all accounts • {publishedCount} published, {draftCount} drafts
              </PlatformCardDescription>
            </div>
            <PlatformButton onClick={handleNewArticle} className="gap-2">
              <Plus className="h-4 w-4" />
              New Article
            </PlatformButton>
          </div>
        </PlatformCardHeader>
        <PlatformCardContent className="space-y-8">
          <KBCategoryManager />
          <KBArticlesList onEditArticle={handleEditArticle} />
        </PlatformCardContent>
      </PlatformCard>

      <KBArticleEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        article={editingArticle}
        onClose={handleCloseEditor}
      />
    </div>
  );
}
