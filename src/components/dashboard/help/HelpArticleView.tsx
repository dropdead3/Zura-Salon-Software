import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KBArticle, useIncrementArticleViews } from '@/hooks/useKnowledgeBase';
import { useFormatNumber } from '@/hooks/useFormatNumber';
import { formatRelativeTime } from '@/lib/format';
import { tokens } from '@/lib/design-tokens';

interface HelpArticleViewProps {
  article: KBArticle;
}

// Simple markdown-to-HTML converter for basic formatting
function renderMarkdown(content: string) {
  // This is a basic implementation - could be replaced with a proper markdown library
  let html = content
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-medium mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-medium mt-8 mb-4">$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-6 list-decimal">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="ml-6 list-disc">$1</li>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank">$1</a>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br />');

  return `<p class="mb-4">${html}</p>`;
}

export function HelpArticleView({ article }: HelpArticleViewProps) {
  const navigate = useNavigate();
  const { formatNumber } = useFormatNumber();
  const incrementViews = useIncrementArticleViews();

  // Track view on mount
  useEffect(() => {
    incrementViews.mutate(article.id);
  }, [article.id]);

  const handleBack = () => {
    if (article.category) {
      navigate(`/dashboard/help/${article.category.slug}`);
    } else {
      navigate('/dashboard/help');
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4">
      <Button
        variant="ghost"
        size={tokens.button.inline}
        onClick={handleBack}
        className="mb-6 gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {article.category?.name || 'Help Center'}
      </Button>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {article.category && (
              <Badge variant="secondary">{article.category.name}</Badge>
            )}
            {article.is_featured && (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Featured
              </Badge>
            )}
          </div>

          <h1 className="text-2xl font-medium">{article.title}</h1>

          {article.summary && (
            <p className="text-muted-foreground text-lg">{article.summary}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {article.published_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatRelativeTime(article.published_at)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {formatNumber(article.view_count)} views
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div
            className="prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
