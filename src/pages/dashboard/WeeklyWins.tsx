import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Trophy, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Lightbulb,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';
import { PageExplainer } from '@/components/ui/PageExplainer';


interface Enrollment {
  id: string;
  current_day: number;
  weekly_wins_due_day: number | null;
  status: string;
}

interface WeeklyReport {
  id: string;
  week_number: number;
  wins_this_week: string | null;
  what_worked: string | null;
  bottleneck: string | null;
  adjustment_for_next_week: string | null;
  is_submitted: boolean;
}

export default function WeeklyWins() {
  const { dashPath } = useOrgDashboardPath();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingReport, setExistingReport] = useState<WeeklyReport | null>(null);
  
  const [formData, setFormData] = useState({
    wins_this_week: '',
    what_worked: '',
    bottleneck: '',
    adjustment_for_next_week: '',
  });

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
      
      // Calculate current week
      const currentWeek = Math.ceil(enrollmentData.current_day / 7);
      
      // Check for existing report for this week
      const { data: reportData } = await supabase
        .from('weekly_wins_reports')
        .select('*')
        .eq('enrollment_id', enrollmentData.id)
        .eq('week_number', currentWeek)
        .maybeSingle();

      if (reportData) {
        setExistingReport(reportData as WeeklyReport);
        if (!reportData.is_submitted) {
          setFormData({
            wins_this_week: reportData.wins_this_week || '',
            what_worked: reportData.what_worked || '',
            bottleneck: reportData.bottleneck || '',
            adjustment_for_next_week: reportData.adjustment_for_next_week || '',
          });
        }
      }
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!enrollment || !user) return;

    // Validate all fields are filled
    if (!formData.wins_this_week || !formData.what_worked || !formData.bottleneck || !formData.adjustment_for_next_week) {
      toast.error('Please fill out all fields');
      return;
    }

    setSubmitting(true);
    
    const currentWeek = Math.ceil(enrollment.current_day / 7);

    try {
      if (existingReport) {
        // Update existing report
        const { error } = await supabase
          .from('weekly_wins_reports')
          .update({
            ...formData,
            is_submitted: true,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', existingReport.id);

        if (error) throw error;
      } else {
        // Create new report
        const { error } = await supabase
          .from('weekly_wins_reports')
          .insert({
            enrollment_id: enrollment.id,
            week_number: currentWeek,
            due_day: enrollment.weekly_wins_due_day || 7,
            ...formData,
            is_submitted: true,
            submitted_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      // Update enrollment - set next weekly wins due day and unpause if paused
      const nextDueDay = (enrollment.weekly_wins_due_day || 7) + 7;
      const { error: updateError } = await supabase
        .from('stylist_program_enrollment')
        .update({
          weekly_wins_due_day: nextDueDay <= 75 ? nextDueDay : null,
          status: 'active',
        })
        .eq('id', enrollment.id);

      if (updateError) throw updateError;

      toast.success('Weekly Wins submitted successfully!');
      navigate(dashPath('/'));
    } catch (error) {
      console.error('Error submitting weekly wins:', error);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveDraft = async () => {
    if (!enrollment || !user) return;
    
    const currentWeek = Math.ceil(enrollment.current_day / 7);

    try {
      if (existingReport) {
        await supabase
          .from('weekly_wins_reports')
          .update(formData)
          .eq('id', existingReport.id);
      } else {
        await supabase
          .from('weekly_wins_reports')
          .insert({
            enrollment_id: enrollment.id,
            week_number: currentWeek,
            due_day: enrollment.weekly_wins_due_day || 7,
            ...formData,
            is_submitted: false,
          });
      }
      toast.success('Draft saved');
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const currentWeek = enrollment ? Math.ceil(enrollment.current_day / 7) : 1;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <DashboardPageHeader
          title="Weekly Wins"
          description={`Week ${currentWeek} Report — Reflect on your progress and plan ahead.`}
          className="mb-8"
        />
        <PageExplainer pageId="weekly-wins" />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !enrollment ? (
          <Card className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground font-sans">
              You haven't started the program yet.
            </p>
          </Card>
        ) : existingReport?.is_submitted ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h2 className="font-display text-xl mb-2">WEEK {currentWeek} SUBMITTED</h2>
            <p className="text-muted-foreground font-sans">
              You've already submitted your Weekly Wins for this week.
            </p>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h2 className="font-display text-sm tracking-wide">WINS THIS WEEK</h2>
              </div>
              <Textarea
                value={formData.wins_this_week}
                onChange={(e) => setFormData({ ...formData, wins_this_week: e.target.value })}
                placeholder="What wins did you have this week? New bookings, client upgrades, DM conversations that converted, etc."
                className="min-h-[120px] font-sans"
              />
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h2 className="font-display text-sm tracking-wide">WHAT WORKED</h2>
              </div>
              <Textarea
                value={formData.what_worked}
                onChange={(e) => setFormData({ ...formData, what_worked: e.target.value })}
                placeholder="Which actions, scripts, or strategies led to the best results?"
                className="min-h-[120px] font-sans"
              />
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h2 className="font-display text-sm tracking-wide">BOTTLENECK</h2>
              </div>
              <Textarea
                value={formData.bottleneck}
                onChange={(e) => setFormData({ ...formData, bottleneck: e.target.value })}
                placeholder="What's the #1 thing slowing you down or preventing more bookings?"
                className="min-h-[120px] font-sans"
              />
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-5 h-5 text-blue-500" />
                <h2 className="font-display text-sm tracking-wide">ADJUSTMENT FOR NEXT WEEK</h2>
              </div>
              <Textarea
                value={formData.adjustment_for_next_week}
                onChange={(e) => setFormData({ ...formData, adjustment_for_next_week: e.target.value })}
                placeholder="What ONE thing will you change or double down on next week?"
                className="min-h-[120px] font-sans"
              />
            </Card>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={saveDraft}
                className="flex-1"
              >
                Save Draft
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 font-display tracking-wide"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    SUBMITTING...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    SUBMIT WEEK {currentWeek}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
