import { useNavigate } from 'react-router-dom';
import { HelpCircle, ChevronRight, Star, BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useFeaturedKBArticles, useKBCategoriesWithCounts } from '@/hooks/useKnowledgeBase';
import { cn } from '@/lib/utils';
import { tokens } from '@/lib/design-tokens';
import { Link } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

export function HelpCenterWidget() {
  const { dashPath } = useOrgDashboardPath();
  const navigate = useNavigate();
  const { data: featuredArticles } = useFeaturedKBArticles();
  const { data: categories } = useKBCategoriesWithCounts();

  const displayArticles = featuredArticles?.slice(0, 3) || [];
  const totalArticles = categories?.reduce((sum, cat) => sum + (cat.article_count || 0), 0) || 0;

  return (
    <Card className={cn(tokens.kpi.tile, 'justify-between min-h-[160px] p-5')}>
      <div className="flex items-center gap-3">
        <div className={tokens.card.iconBox}>
          <HelpCircle className={tokens.card.icon} />
        </div>
        <span className={cn(tokens.kpi.label, 'flex-1')}>HELP CENTER</span>
      </div>

      <div className="mt-4 flex-1">
        {displayArticles.length > 0 ? (
          <div className="space-y-3">
            {displayArticles.map((article) => (
              <button
                key={article.id}
                onClick={() =>
                  navigate(
                    `${dashPath('/help/${article.category?.slug || 'uncategorized'}/${article.slug}')}`
                  )
                }
                className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {article.title}
                    </p>
                    {article.category && (
                      <p className="text-xs text-muted-foreground">
                        {article.category.name}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <BookOpen className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {totalArticles} articles available
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-2 pt-2 border-t border-border/40 min-h-[28px]">
        <Link 
          to={dashPath('/help')}
          className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          Browse Help Center <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </Card>
  );
}
