import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Trash2, HelpCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QuizBuilder } from './QuizBuilder';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface Quiz {
  id: string;
  video_id: string;
  title: string;
  passing_score: number;
  is_required: boolean;
  created_at: string;
  video?: {
    title: string;
  };
  questions_count?: number;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: Json;
  correct_answer: string;
  order_index: number;
}

export function TrainingQuizManager() {
  const queryClient = useQueryClient();
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<QuizQuestion[]>([]);

  // Fetch all quizzes with video info
  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['training-quizzes'],
    queryFn: async () => {
      const { data: quizzesData, error } = await supabase
        .from('training_quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch video titles and question counts
      const quizzesWithDetails = await Promise.all(
        (quizzesData || []).map(async (quiz) => {
          const [videoResult, questionsResult] = await Promise.all([
            supabase
              .from('training_videos')
              .select('title')
              .eq('id', quiz.video_id)
              .single(),
            supabase
              .from('training_quiz_questions')
              .select('id', { count: 'exact', head: true })
              .eq('quiz_id', quiz.id),
          ]);

          return {
            ...quiz,
            video: videoResult.data,
            questions_count: questionsResult.count || 0,
          };
        })
      );

      return quizzesWithDetails as Quiz[];
    },
  });

  // Fetch all videos for dropdown
  const { data: videos = [] } = useQuery({
    queryKey: ['training-videos-for-quiz'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_videos')
        .select('id, title')
        .eq('is_active', true)
        .order('title');
      if (error) throw error;
      return data;
    },
  });

  // Delete quiz
  const deleteQuiz = useMutation({
    mutationFn: async (quizId: string) => {
      const { error } = await supabase
        .from('training_quizzes')
        .delete()
        .eq('id', quizId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-quizzes'] });
      toast.success('Quiz deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleEditQuiz = async (quiz: Quiz) => {
    // Fetch questions for this quiz
    const { data: questions } = await supabase
      .from('training_quiz_questions')
      .select('*')
      .eq('quiz_id', quiz.id)
      .order('order_index');

    setEditingQuiz(quiz);
    setEditingQuestions(
      (questions || []).map((q) => ({
        ...q,
        options: q.options as string[],
      })) as QuizQuestion[]
    );
  };

  const handleClose = () => {
    setSelectedVideoId(null);
    setEditingQuiz(null);
    setEditingQuestions([]);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['training-quizzes'] });
    handleClose();
  };

  // Get videos without quizzes
  const videosWithoutQuizzes = videos.filter(
    (v) => !quizzes.some((q) => q.video_id === v.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create new quiz */}
      {videosWithoutQuizzes.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Create New Quiz</h3>
              <p className="text-sm text-muted-foreground">
                Select a training video to add a comprehension quiz
              </p>
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value=""
              onChange={(e) => setSelectedVideoId(e.target.value)}
            >
              <option value="">Select a video...</option>
              {videosWithoutQuizzes.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.title}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* Existing quizzes */}
      {quizzes.length === 0 ? (
        <Card className="p-12 text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            No quizzes created yet. Select a video above to create a quiz.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{quiz.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {quiz.video?.title || 'Unknown video'} •{' '}
                      {quiz.questions_count} questions • {quiz.passing_score}% to pass
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {quiz.is_required && (
                    <Badge variant="secondary">Required</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditQuiz(quiz)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteQuiz.mutate(quiz.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quiz Builder Dialog */}
      <Dialog
        open={!!selectedVideoId || !!editingQuiz}
        onOpenChange={() => handleClose()}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuiz ? 'Edit Quiz' : 'Create Quiz'}
            </DialogTitle>
          </DialogHeader>
          {(selectedVideoId || editingQuiz) && (
            <QuizBuilder
              videoId={selectedVideoId || editingQuiz!.video_id}
              existingQuizId={editingQuiz?.id}
              existingTitle={editingQuiz?.title}
              existingPassingScore={editingQuiz?.passing_score}
              existingIsRequired={editingQuiz?.is_required}
              existingQuestions={editingQuestions.map((q) => ({
                id: q.id,
                question_text: q.question_text,
                question_type: q.question_type as 'multiple_choice' | 'true_false',
                options: (q.options as string[]) || [],
                correct_answer: q.correct_answer,
                order_index: q.order_index,
              }))}
              onSaved={handleSaved}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
