import React, { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Brain, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PLATFORM_NAME } from '@/lib/brand';

interface InsightsNudgeBannerProps {
  userId?: string;
  isLeadership?: boolean;
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export function InsightsNudgeBanner({ userId, isLeadership }: InsightsNudgeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const { data: daysSinceLastCheck } = useQuery({
    queryKey: ['insights-last-check', userId, isLeadership],
    queryFn: async () => {
      if (!userId) return null;

      // Check personal insights first (all users have these)
      const { data: personal } = await supabase
        .from('ai_personal_insights' as any)
        .select('generated_at')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(1);

      let lastDate: Date | null = null;

      if ((personal as any)?.[0]?.generated_at) {
        lastDate = new Date((personal as any)[0].generated_at);
      }

      // For leadership, also check business insights (use whichever is more recent)
      if (isLeadership) {
        const { data: ep } = await supabase
          .from('employee_profiles')
          .select('organization_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (ep?.organization_id) {
          const { data: business } = await supabase
            .from('ai_business_insights')
            .select('generated_at')
            .eq('organization_id', ep.organization_id)
            .order('generated_at', { ascending: false })
            .limit(1);

          if (business?.[0]?.generated_at) {
            const bizDate = new Date(business[0].generated_at);
            if (!lastDate || bizDate > lastDate) {
              lastDate = bizDate;
            }
          }
        }
      }

      // If no insights ever generated, show a "never checked" nudge
      if (!lastDate) return -1;

      const diffMs = Date.now() - lastDate.getTime();
      if (diffMs < FOURTEEN_DAYS_MS) return null; // Within threshold — no banner

      return Math.floor(diffMs / (24 * 60 * 60 * 1000));
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 min
  });

  if (daysSinceLastCheck === null || daysSinceLastCheck === undefined || dismissed) return null;

  const isNeverChecked = daysSinceLastCheck === -1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5"
      >
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="flex-shrink-0 p-2.5 rounded-full bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {isNeverChecked
                ? `You haven't explored your ${PLATFORM_NAME} Insights yet`
                : `You haven't checked your insights in ${daysSinceLastCheck} days`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isNeverChecked
                ? `${PLATFORM_NAME} has personalized performance data and growth tips ready for you — let's grow! 🌱`
                : `${PLATFORM_NAME} has fresh performance data and growth tips waiting for you — let's grow! 🌱`}
            </p>
          </div>
          <Link to="/dashboard">
            <Button size={tokens.button.card} variant="outline" className="flex-shrink-0 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50">
              View Insights
            </Button>
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
