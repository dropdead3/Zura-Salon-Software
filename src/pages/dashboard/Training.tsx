import { useState, useEffect, useMemo } from 'react';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Progress } from '@/components/ui/progress';
import { Video, Play, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementNotificationToast } from '@/components/achievements/AchievementNotificationToast';
import { PageExplainer } from '@/components/ui/PageExplainer';

interface TrainingVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  category: string;
  duration_minutes: number | null;
  order_index: number;
  required_for_roles: string[] | null;
}

interface TrainingProgress {
  video_id: string;
  completed_at: string | null;
}

const categories = [
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'client_engine', label: 'Client Engine Program' },
  { key: 'technique', label: 'Technique' },
  { key: 'product', label: 'Product Knowledge' },
  { key: 'client-service', label: 'Client Service' },
];

export default function Training() {
  const { dashPath } = useOrgDashboardPath();
  const { user, roles: userRoles } = useAuth();
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [progress, setProgress] = useState<TrainingProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { checkAchievements, currentAchievement, isToastVisible, dismissCurrentAchievement } = useAchievements();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    // Fetch videos
    const { data: videosData, error: videosError } = await supabase
      .from('training_videos')
      .select('*')
      .eq('is_active', true)
      .order('order_index');

    if (videosError) {
      console.error('Error fetching videos:', videosError);
    } else {
      setVideos((videosData || []) as TrainingVideo[]);
    }

    // Fetch progress
    if (user) {
      const { data: progressData, error: progressError } = await supabase
        .from('training_progress')
        .select('video_id, completed_at')
        .eq('user_id', user.id);

      if (!progressError) {
        setProgress((progressData || []) as TrainingProgress[]);
      }
    }

    setLoading(false);
  };

  // Fetch individual assignments for this user
  const { data: individualAssignments = [] } = useQuery({
    queryKey: ['my-training-assignments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('training_assignments')
        .select('video_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markComplete = async (videoId: string) => {
    if (!user) return;

    const existingProgress = progress.find(p => p.video_id === videoId);

    if (existingProgress) {
      await supabase
        .from('training_progress')
        .update({ completed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('video_id', videoId);
    } else {
      await supabase
        .from('training_progress')
        .insert({
          user_id: user.id,
          video_id: videoId,
          completed_at: new Date().toISOString(),
          watch_progress: 100,
        });
    }

    setProgress(prev => [
      ...prev.filter(p => p.video_id !== videoId),
      { video_id: videoId, completed_at: new Date().toISOString() }
    ]);
    
    // Check for training achievements
    checkAchievements('training');
  };

  // Filter videos by user's roles OR individual assignments
  const roleFilteredVideos = useMemo(() => {
    return videos.filter(video => {
      // Super admins see everything
      if (userRoles.includes('super_admin')) return true;
      
      // Check if individually assigned to this user
      if (individualAssignments.some(a => a.video_id === video.id)) {
        return true;
      }
      
      // If no roles specified, show to everyone
      if (!video.required_for_roles || video.required_for_roles.length === 0) {
        return true;
      }
      
      // Show if user has at least one matching role
      return video.required_for_roles.some(role => 
        userRoles.includes(role as any)
      );
    });
  }, [videos, userRoles, individualAssignments]);

  // Apply category filter on top of role-filtered videos
  const filteredVideos = selectedCategory === 'all' 
    ? roleFilteredVideos 
    : roleFilteredVideos.filter(v => v.category === selectedCategory);

  // Calculate progress based on role-filtered videos only
  const completedCount = progress.filter(p => 
    p.completed_at && roleFilteredVideos.some(v => v.id === p.video_id)
  ).length;
  const totalCount = roleFilteredVideos.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const isComplete = (videoId: string) => {
    return progress.some(p => p.video_id === videoId && p.completed_at);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <DashboardPageHeader
          title="Training"
          description="Complete assigned training videos and track your progress across all categories."
          backTo={dashPath('/')}
          backLabel="Back to Dashboard"
          className="mb-8"
        />
        <PageExplainer pageId="training" />

        {/* Progress Overview */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-sans text-muted-foreground">
              Overall Progress
            </span>
            <span className="text-sm font-display">
              {completedCount} / {totalCount} completed
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </Card>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
            className="font-display text-xs tracking-wide"
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.key}
              variant={selectedCategory === cat.key ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat.key)}
              className="font-display text-xs tracking-wide"
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Videos */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredVideos.length === 0 ? (
          <Card className="p-12 text-center">
            <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground font-sans">
              No training videos available yet.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  {isComplete(video.id) && (
                    <div className="absolute top-3 right-3 w-8 h-8 bg-green-500 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <Play className="w-12 h-12 text-muted-foreground" />
                </div>
                <div className="p-4">
                  <span className="text-xs text-muted-foreground font-display tracking-wide uppercase">
                    {categories.find(c => c.key === video.category)?.label || video.category}
                  </span>
                  <h3 className="font-sans font-medium mt-1 mb-2 line-clamp-2">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-sm text-muted-foreground font-sans line-clamp-2 mb-3">
                      {video.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {video.duration_minutes && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {video.duration_minutes} min
                      </span>
                    )}
                    {!isComplete(video.id) && (
                      <Button 
                        size={tokens.button.inline} 
                        variant="outline"
                        onClick={() => markComplete(video.id)}
                        className="text-xs"
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Achievement Toast */}
        {currentAchievement && (
          <AchievementNotificationToast
            achievement={currentAchievement}
            isVisible={isToastVisible}
            onClose={dismissCurrentAchievement}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
