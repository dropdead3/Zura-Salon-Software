import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface KBCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  article_count?: number;
}

export interface KBArticle {
  id: string;
  category_id: string | null;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  status: 'draft' | 'published';
  is_featured: boolean;
  is_pinned: boolean;
  view_count: number;
  author_id: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category?: KBCategory;
}

// Category hooks
export function useKBCategories() {
  return useQuery({
    queryKey: ['kb-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as unknown as KBCategory[];
    },
  });
}

export function useAdminKBCategories() {
  return useQuery({
    queryKey: ['kb-categories-admin'],
    queryFn: async () => {
      // Get categories with article counts
      const { data: categories, error } = await supabase
        .from('kb_categories')
        .select('*')
        .order('display_order');
      
      if (error) throw error;

      // Get article counts per category
      const { data: articles } = await supabase
        .from('kb_articles')
        .select('category_id');
      
      const counts: Record<string, number> = {};
      articles?.forEach(a => {
        if (a.category_id) {
          counts[a.category_id] = (counts[a.category_id] || 0) + 1;
        }
      });

      return (categories as KBCategory[]).map(c => ({
        ...c,
        article_count: counts[c.id] || 0,
      }));
    },
  });
}

export function useCreateKBCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<KBCategory>) => {
      const { data: result, error } = await supabase
        .from('kb_categories')
        .insert(data as { name: string; slug: string })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
      toast.success('Category created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create category: ' + error.message);
    },
  });
}

export function useUpdateKBCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<KBCategory> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('kb_categories')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
      toast.success('Category updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update category: ' + error.message);
    },
  });
}

export function useDeleteKBCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kb_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-categories'] });
      toast.success('Category deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete category: ' + error.message);
    },
  });
}

// Article hooks
export function useKBArticles(categorySlug?: string) {
  return useQuery({
    queryKey: ['kb-articles', categorySlug],
    queryFn: async () => {
      let query = supabase
        .from('kb_articles')
        .select('*, category:kb_categories(*)')
        .eq('status', 'published')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (categorySlug) {
        // Get category by slug first
        const { data: category } = await supabase
          .from('kb_categories')
          .select('id')
          .eq('slug', categorySlug)
          .single();
        
        if (category) {
          query = query.eq('category_id', category.id);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as KBArticle[];
    },
  });
}

export function useAdminKBArticles() {
  return useQuery({
    queryKey: ['kb-articles-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_articles')
        .select('*, category:kb_categories(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as KBArticle[];
    },
  });
}

export function useFeaturedKBArticles() {
  return useQuery({
    queryKey: ['kb-articles-featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_articles')
        .select('*, category:kb_categories(*)')
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('published_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data as unknown as KBArticle[];
    },
  });
}

export function useKBArticle(slug: string) {
  return useQuery({
    queryKey: ['kb-article', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_articles')
        .select('*, category:kb_categories(*)')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data as unknown as KBArticle;
    },
    enabled: !!slug,
  });
}

export function useCreateKBArticle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<KBArticle>) => {
      const insertData = {
        title: data.title!,
        slug: data.slug!,
        content: data.content!,
        category_id: data.category_id || null,
        summary: data.summary || null,
        status: data.status || 'draft',
        is_featured: data.is_featured || false,
        is_pinned: data.is_pinned || false,
        author_id: user?.id!,
        published_at: data.status === 'published' ? new Date().toISOString() : null,
      };
      
      const { data: result, error } = await supabase
        .from('kb_articles')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      toast.success('Article created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create article: ' + error.message);
    },
  });
}

export function useUpdateKBArticle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<KBArticle> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...data };
      
      // Set published_at when publishing
      if (data.status === 'published') {
        const { data: existing } = await supabase
          .from('kb_articles')
          .select('published_at')
          .eq('id', id)
          .single();
        
        if (!existing?.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }
      
      const { data: result, error } = await supabase
        .from('kb_articles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      toast.success('Article updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update article: ' + error.message);
    },
  });
}

export function useDeleteKBArticle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kb_articles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      toast.success('Article deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete article: ' + error.message);
    },
  });
}

export function useIncrementArticleViews() {
  return useMutation({
    mutationFn: async (articleId: string) => {
      // First get current view count, then increment
      const { data: article } = await supabase
        .from('kb_articles')
        .select('view_count')
        .eq('id', articleId)
        .single();
      
      if (article) {
        const { error } = await supabase
          .from('kb_articles')
          .update({ view_count: (article.view_count || 0) + 1 })
          .eq('id', articleId);
        
        if (error) console.warn('Failed to increment view count:', error);
      }
    },
  });
}

// Search hook
export function useKBSearch(query: string) {
  return useQuery({
    queryKey: ['kb-search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      
      const searchTerm = `%${query}%`;
      const { data, error } = await supabase
        .from('kb_articles')
        .select('*, category:kb_categories(*)')
        .eq('status', 'published')
        .or(`title.ilike.${searchTerm},summary.ilike.${searchTerm},content.ilike.${searchTerm}`)
        .limit(20);
      
      if (error) throw error;
      return data as unknown as KBArticle[];
    },
    enabled: query.length >= 2,
  });
}

// Categories with article counts for help center
export function useKBCategoriesWithCounts() {
  return useQuery({
    queryKey: ['kb-categories-with-counts'],
    queryFn: async () => {
      const { data: categories, error } = await supabase
        .from('kb_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;

      // Get published article counts
      const { data: articles } = await supabase
        .from('kb_articles')
        .select('category_id')
        .eq('status', 'published');
      
      const counts: Record<string, number> = {};
      articles?.forEach(a => {
        if (a.category_id) {
          counts[a.category_id] = (counts[a.category_id] || 0) + 1;
        }
      });

      return (categories as KBCategory[]).map(c => ({
        ...c,
        article_count: counts[c.id] || 0,
      }));
    },
  });
}
