import { SlidersHorizontal, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaderboardWeightsManager } from '@/components/dashboard/LeaderboardWeightsManager';
import { AchievementsConfigPanel } from './AchievementsConfigPanel';

export function LeaderboardConfigurator() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="scoring" className="space-y-6">
        <TabsList>
          <TabsTrigger value="scoring" className="gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Scoring Weights
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-2">
            <Trophy className="w-4 h-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scoring" className="space-y-6 mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">SCORING ALGORITHM</CardTitle>
              <CardDescription>
                Configure how the overall leaderboard score is calculated from performance metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardWeightsManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6 mt-0">
          <AchievementsConfigPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
