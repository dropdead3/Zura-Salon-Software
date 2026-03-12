/**
 * AIInsightService — Read-only wrapper for AI insight generation.
 *
 * Calls the ai-backroom-insights edge function.
 * Never writes to ledger, projections, or operational tables.
 */

import { supabase } from '@/integrations/supabase/client';

export interface BackroomAIInsight {
  category: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  staffMentions?: string[] | null;
  estimatedImpact?: string | null;
  suggestedAction?: string | null;
}

export interface BackroomAIInsightsData {
  summaryLine: string;
  overallSentiment: 'positive' | 'neutral' | 'concerning';
  insights: BackroomAIInsight[];
}

/**
 * Fetch cached insights from ai_business_insights.
 */
export async function fetchCachedInsights(
  orgId: string,
  locationId?: string | null
) {
  let query = supabase
    .from('ai_business_insights' as any)
    .select('*')
    .eq('organization_id', orgId)
    .order('generated_at', { ascending: false })
    .limit(1);

  const locationKey = locationId ? `backroom:${locationId}` : 'backroom:all';
  query = query.eq('location_id', locationKey);

  const { data, error } = await query;
  if (error) throw error;
  return (data as any)?.[0] ?? null;
}

/**
 * Request fresh AI insights via edge function.
 */
export async function refreshInsights(
  locationId?: string | null
): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-backroom-insights`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        forceRefresh: true,
        locationId: locationId || null,
      }),
    }
  );

  if (response.status === 429) throw new Error('Rate limit exceeded');
  if (response.status === 402) throw new Error('AI credits exhausted');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate insights');
  }
}
