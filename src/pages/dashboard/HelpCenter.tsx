import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Star, BookOpen } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  useKBCategoriesWithCounts,
  useFeaturedKBArticles,
  useKBArticles,
  useKBArticle,
  useKBSearch,
} from '@/hooks/useKnowledgeBase';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { HelpArticleView } from '@/components/dashboard/help/HelpArticleView';

function getIcon(iconName: string) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    BookOpen: LucideIcons.BookOpen,
    Rocket: LucideIcons.Rocket,
    CreditCard: LucideIcons.CreditCard,
    Users: LucideIcons.Users,
    BarChart3: LucideIcons.BarChart3,
    Plug: LucideIcons.Plug,
    HelpCircle: LucideIcons.HelpCircle,
    Settings: LucideIcons.Settings,
    Shield: LucideIcons.Shield,
    Zap: LucideIcons.Zap,
    FileText: LucideIcons.FileText,
    Calendar: LucideIcons.Calendar,
    Bell: LucideIcons.Bell,
    Star: LucideIcons.Star,
    Heart: LucideIcons.Heart,
  };
  return icons[iconName] || LucideIcons.BookOpen;
}

export default function HelpCenter() {
  const { categorySlug, articleSlug } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: categories } = useKBCategoriesWithCounts();
  const { data: featuredArticles } = useFeaturedKBArticles();
  const { data: categoryArticles } = useKBArticles(categorySlug);
  const { data: article } = useKBArticle(articleSlug || '');
  const { data: searchResults } = useKBSearch(searchQuery);

  // Show article view if we have an article slug
  if (articleSlug && article) {
    return <HelpArticleView article={article} />;
  }

  const currentCategory = categorySlug
    ? categories?.find((c) => c.slug === categorySlug)
    : null;

  const isSearching = searchQuery.length >= 2;

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        {/* Back button - always show, changes destination based on context */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size={tokens.button.inline}
            onClick={() => navigate(currentCategory ? '/dashboard/help' : '/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {currentCategory ? 'Back to Help Center' : 'Back to Dashboard'}
          </Button>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-display mb-2">
            {currentCategory ? currentCategory.name : 'Help Center'}
          </h1>
          <p className="text-muted-foreground">
            {currentCategory
              ? currentCategory.description
              : 'Find answers to common questions'}
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Search Results */}
      {isSearching && (
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-4">
            Search Results ({searchResults?.length || 0})
          </h2>
          {searchResults && searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map((article) => (
                <Card
                  key={article.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() =>
                    navigate(`/dashboard/help/${article.category?.slug || 'uncategorized'}/${article.slug}`)
                  }
                >
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">{article.title}</CardTitle>
                    {article.summary && (
                      <CardDescription>{article.summary}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No articles found for "{searchQuery}"
            </p>
          )}
        </div>
      )}

      {/* Category View */}
      {currentCategory && !isSearching && (
        <div className="space-y-4">
          {categoryArticles && categoryArticles.length > 0 ? (
            categoryArticles.map((article) => (
              <Card
                key={article.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() =>
                  navigate(`/dashboard/help/${currentCategory.slug}/${article.slug}`)
                }
              >
                <CardHeader className="py-4">
                  <div className="flex items-center gap-2">
                    {article.is_featured && (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    )}
                    <CardTitle className="text-base">{article.title}</CardTitle>
                  </div>
                  {article.summary && (
                    <CardDescription>{article.summary}</CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No articles in this category yet.
            </p>
          )}
        </div>
      )}

      {/* Home View */}
      {!currentCategory && !isSearching && (
        <>
          {/* Featured Articles */}
          {featuredArticles && featuredArticles.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Featured Articles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featuredArticles.map((article) => (
                  <Card
                    key={article.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors bg-primary/5"
                    onClick={() =>
                      navigate(
                        `/dashboard/help/${article.category?.slug || 'uncategorized'}/${article.slug}`
                      )
                    }
                  >
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        {article.title}
                      </CardTitle>
                      {article.summary && (
                        <CardDescription>{article.summary}</CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          <div>
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Browse by Category
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories?.map((category) => {
                const CategoryIcon = getIcon(category.icon);
                return (
                  <Card
                    key={category.id}
                    className={cn(
                      'cursor-pointer hover:border-primary/50 transition-colors',
                      category.article_count === 0 && 'opacity-60'
                    )}
                    onClick={() => navigate(`/dashboard/help/${category.slug}`)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <CategoryIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{category.name}</CardTitle>
                          <CardDescription>
                            {category.article_count || 0} article
                            {category.article_count !== 1 ? 's' : ''}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
