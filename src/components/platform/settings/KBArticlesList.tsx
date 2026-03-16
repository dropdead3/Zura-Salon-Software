import { useState, useMemo } from 'react';
import { Pencil, Trash2, Eye, Star, Pin, Search, Filter } from 'lucide-react';
import { PlatformButton } from '../ui/PlatformButton';
import { PlatformInput } from '../ui/PlatformInput';
import {
  useAdminKBArticles,
  useAdminKBCategories,
  useDeleteKBArticle,
  useUpdateKBArticle,
  KBArticle,
} from '@/hooks/useKnowledgeBase';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectValue,
  PlatformSelectContent as SelectContent,
  PlatformSelectItem as SelectItem,
  PlatformSelectTrigger as SelectTrigger,
} from '@/components/platform/ui/PlatformSelect';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface KBArticlesListProps {
  onEditArticle: (article: KBArticle) => void;
}

export function KBArticlesList({ onEditArticle }: KBArticlesListProps) {
  const { data: articles, isLoading } = useAdminKBArticles();
  const { data: categories } = useAdminKBCategories();
  const deleteArticle = useDeleteKBArticle();
  const updateArticle = useUpdateKBArticle();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    
    return articles.filter((article) => {
      // Status filter
      if (statusFilter !== 'all' && article.status !== statusFilter) return false;
      
      // Category filter
      if (categoryFilter !== 'all' && article.category_id !== categoryFilter) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          article.title.toLowerCase().includes(query) ||
          article.summary?.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [articles, statusFilter, categoryFilter, searchQuery]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      await deleteArticle.mutateAsync(id);
    }
  };

  const handleTogglePublish = async (article: KBArticle) => {
    await updateArticle.mutateAsync({
      id: article.id,
      status: article.status === 'published' ? 'draft' : 'published',
    });
  };

  const handleToggleFeatured = async (article: KBArticle) => {
    await updateArticle.mutateAsync({
      id: article.id,
      is_featured: !article.is_featured,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Articles</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <PlatformInput
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-500 text-sm">Loading articles...</div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          {articles?.length === 0 ? 'No articles yet. Create your first article!' : 'No articles match your filters.'}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700/50 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Views
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredArticles.map((article) => (
                <tr key={article.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {article.is_featured && (
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                      )}
                      {article.is_pinned && (
                        <Pin className="h-4 w-4 text-violet-400" />
                      )}
                      <div>
                        <div className="font-medium text-white">{article.title}</div>
                        {article.summary && (
                          <div className="text-xs text-slate-500 truncate max-w-xs">
                            {article.summary}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-400">
                      {article.category?.name || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        article.status === 'published'
                          ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                          : 'border-slate-600 text-slate-400'
                      )}
                    >
                      {article.status === 'published' ? '● Published' : '○ Draft'}
                    </Badge>
                    {article.published_at && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-400">
                      {article.view_count.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <PlatformButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFeatured(article)}
                        className={cn(
                          'h-8 w-8 p-0',
                          article.is_featured && 'text-amber-400'
                        )}
                        title={article.is_featured ? 'Remove from featured' : 'Add to featured'}
                      >
                        <Star className={cn('h-4 w-4', article.is_featured && 'fill-current')} />
                      </PlatformButton>
                      <PlatformButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditArticle(article)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </PlatformButton>
                      <PlatformButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(article)}
                        className="h-8 w-8 p-0"
                        title={article.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        <Eye className={cn('h-4 w-4', article.status === 'draft' && 'text-slate-600')} />
                      </PlatformButton>
                      <PlatformButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(article.id)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </PlatformButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
