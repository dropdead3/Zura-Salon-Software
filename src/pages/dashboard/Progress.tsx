import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card } from '@/components/ui/card';
import { CheckCircle, Circle, Lock, AlertCircle, Loader2 } from 'lucide-react';

interface Enrollment {
  id: string;
  current_day: number;
  streak_count: number;
  status: string;
  restart_count: number;
  start_date: string;
}

interface DailyCompletion {
  day_number: number;
  is_complete: boolean;
}

export default function Progress() {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [completions, setCompletions] = useState<DailyCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch enrollment
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('stylist_program_enrollment')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (enrollmentError) {
      console.error('Error fetching enrollment:', enrollmentError);
      setLoading(false);
      return;
    }

    if (enrollmentData) {
      setEnrollment(enrollmentData as Enrollment);

      // Fetch completions
      const { data: completionsData } = await supabase
        .from('daily_completions')
        .select('day_number, is_complete')
        .eq('enrollment_id', enrollmentData.id);

      setCompletions((completionsData || []) as DailyCompletion[]);
    }

    setLoading(false);
  };

  const getDayStatus = (day: number): 'complete' | 'current' | 'locked' | 'missed' => {
    if (!enrollment) return 'locked';
    
    const completion = completions.find(c => c.day_number === day);
    
    if (completion?.is_complete) return 'complete';
    if (day === enrollment.current_day) return 'current';
    if (day < enrollment.current_day) return 'missed';
    return 'locked';
  };

  // Weekly wins days
  const weeklyWinsDays = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 75];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <DashboardPageHeader
          title="Program Progress"
          description="Visualize your 75-day program journey, track streaks, and celebrate milestones."
          className="mb-8"
        />

        {loading ? (
          <DashboardLoader className="py-20" />
        ) : !enrollment ? (
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground font-sans">
              You haven't started the program yet.
            </p>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground font-display tracking-wide mb-1">
                  CURRENT DAY
                </p>
                <p className="font-display text-2xl">{enrollment.current_day}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground font-display tracking-wide mb-1">
                  STREAK
                </p>
                <p className="font-display text-2xl">{enrollment.streak_count}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground font-display tracking-wide mb-1">
                  RESTARTS
                </p>
                <p className="font-display text-2xl">{enrollment.restart_count}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground font-display tracking-wide mb-1">
                  STATUS
                </p>
                <p className="font-display text-2xl uppercase">{enrollment.status}</p>
              </Card>
            </div>

            {/* Calendar Grid */}
            <Card className="p-6">
              <h2 className="font-display text-sm tracking-wide mb-6">75-DAY TIMELINE</h2>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-6 text-xs font-sans text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Complete
                </span>
                <span className="flex items-center gap-2">
                  <Circle className="w-4 h-4 text-foreground fill-foreground" />
                  Today
                </span>
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Locked
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border border-yellow-500" />
                  Weekly Wins Due
                </span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 lg:grid-cols-15 gap-2">
                {Array.from({ length: 75 }, (_, i) => i + 1).map((day) => {
                  const status = getDayStatus(day);
                  const isWeeklyWins = weeklyWinsDays.includes(day);

                  return (
                    <div
                      key={day}
                      className={`
                        aspect-square flex items-center justify-center text-xs font-display
                        transition-colors relative
                        ${isWeeklyWins ? 'ring-1 ring-yellow-500' : ''}
                        ${status === 'complete' 
                          ? 'bg-green-500/10 text-green-600' 
                          : status === 'current'
                          ? 'bg-foreground text-background'
                          : status === 'missed'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-muted text-muted-foreground'
                        }
                      `}
                    >
                      {status === 'complete' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : status === 'locked' ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        day
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
