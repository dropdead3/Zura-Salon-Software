import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, X, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: Json;
  correct_answer: string;
  order_index: number;
}

interface QuizCardProps {
  quizId: string;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
  onComplete: (passed: boolean, score: number) => void;
}

export function QuizCard({
  quizId,
  title,
  passingScore,
  questions,
  onComplete,
}: QuizCardProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setSubmitting(true);

    // Calculate score
    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= passingScore;

    try {
      // Save attempt
      await supabase.from('training_quiz_attempts').insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        passed,
        answers,
      });

      // Award points if passed
      if (passed) {
        await supabase.rpc('award_points', {
          _user_id: user.id,
          _action_type: 'quiz_passed',
          _reference_id: quizId,
          _description: `Passed quiz: ${title}`,
        });
      }

      setShowResults(true);
      onComplete(passed, score);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (showResults) {
    const correctCount = questions.filter(
      (q) => answers[q.id] === q.correct_answer
    ).length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= passingScore;

    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div
            className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
              passed ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}
          >
            {passed ? (
              <Check className="w-10 h-10 text-green-600" />
            ) : (
              <X className="w-10 h-10 text-red-600" />
            )}
          </div>

          <h3 className="text-2xl font-medium mb-2">
            {passed ? 'Congratulations!' : 'Keep Trying!'}
          </h3>

          <p className="text-muted-foreground mb-4">
            You scored{' '}
            <span className="font-medium text-foreground">{score}%</span> ({correctCount}/
            {totalQuestions} correct)
          </p>

          <Badge
            variant={passed ? 'default' : 'destructive'}
            className={passed ? 'bg-green-600' : ''}
          >
            {passed ? 'PASSED' : `Need ${passingScore}% to pass`}
          </Badge>

          {passed && (
            <p className="text-sm text-green-600 mt-4">
              +15 points earned for passing this quiz!
            </p>
          )}
        </div>
      </Card>
    );
  }

  const options = (currentQuestion.options as string[]) || [];

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-sm tracking-wide">{title}</h3>
          <span className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <div className="mb-6">
        <p className="text-lg font-medium mb-4">{currentQuestion.question_text}</p>

        <RadioGroup
          value={answers[currentQuestion.id] || ''}
          onValueChange={handleAnswer}
          className="space-y-3"
        >
          {options.map((option, index) => (
            <div
              key={index}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                answers[currentQuestion.id] === option
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value={option} id={`option-${index}`} />
              <Label
                htmlFor={`option-${index}`}
                className="flex-1 cursor-pointer"
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>

        {currentIndex === totalQuestions - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < totalQuestions || submitting}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : null}
            Submit Quiz
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </Card>
  );
}
