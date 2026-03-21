import { useState } from 'react';
import { AlertCircle, Heart, Pause, RotateCcw, Shield, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LiveCountdown } from './LiveCountdown';
import { UsePassConfirmDialog } from './UsePassConfirmDialog';

interface MissedDayDialogProps {
  open: boolean;
  daysMissed: number;
  forgiveCreditsRemaining: number;
  hasPendingPauseRequest: boolean;
  creditExpiresAt: Date | null;
  onUseCredit: () => Promise<void>;
  onRequestPause: (reason: string) => Promise<void>;
  onRestart: () => Promise<void>;
}

export function MissedDayDialog({
  open,
  daysMissed,
  forgiveCreditsRemaining,
  hasPendingPauseRequest,
  creditExpiresAt,
  onUseCredit,
  onRequestPause,
  onRestart,
}: MissedDayDialogProps) {
  const [view, setView] = useState<'main' | 'pause'>('main');
  const [pauseReason, setPauseReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const canUseCredit = forgiveCreditsRemaining > 0 && daysMissed <= 1 && !isExpired;

  const handleUseCredit = async () => {
    setShowConfirmDialog(false);
    setIsLoading(true);
    await onUseCredit();
    setIsLoading(false);
  };

  const handleRequestPause = async () => {
    if (!pauseReason.trim()) return;
    setIsLoading(true);
    await onRequestPause(pauseReason);
    setIsLoading(false);
    setView('main');
  };

  const handleRestart = async () => {
    setIsLoading(true);
    await onRestart();
    setIsLoading(false);
  };

  if (view === 'pause') {
    return (
      <Dialog open={open}>
        <DialogContent 
          className="max-w-md border-none bg-gradient-to-b from-card via-card to-oat/20 shadow-2xl" 
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Pause className="h-4 w-4 text-primary" />
              </div>
              Request Emergency Pause
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Emergency pauses are for extreme sickness or emergencies only. Leadership will review your request.
            </p>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for pause request</Label>
              <Textarea
                id="reason"
                placeholder="Please describe your emergency or situation..."
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={4}
                className="bg-background/80 backdrop-blur-sm border-oat/50 focus:border-primary"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setView('main')}
                className="flex-1 border-oat/50 hover:bg-oat/20"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                onClick={handleRequestPause}
                disabled={!pauseReason.trim() || isLoading}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open}>
        <DialogContent 
          className="max-w-md border-none bg-gradient-to-b from-card via-card to-oat/20 shadow-2xl overflow-hidden" 
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-oat/10 pointer-events-none" />
          
          <DialogHeader className="text-center space-y-4 relative">
            {/* Premium alert icon with gradient ring - centered */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-destructive/20 via-destructive/10 to-oat/20 flex items-center justify-center ring-1 ring-destructive/20">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-card to-oat/30 flex items-center justify-center shadow-inner">
                    <AlertCircle className="h-7 w-7 text-destructive" />
                  </div>
                </div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-full bg-destructive/10 blur-xl -z-10" />
              </div>
            </div>
            
            <DialogTitle className="text-2xl font-display uppercase tracking-wider text-foreground">
              You Missed {daysMissed} Day{daysMissed > 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="text-center space-y-2 relative">
            <p className="text-muted-foreground leading-relaxed">
              The Client Engine is a <strong className="text-foreground font-medium">75-day consecutive challenge</strong>. 
              When you miss a day, you must start over from Day 1.
            </p>
          </div>

          {/* Why the restart - Premium card */}
          <div className="relative bg-gradient-to-br from-oat/40 via-oat/20 to-transparent rounded-xl p-5 space-y-3 border border-oat/30">
            <h4 className="font-display text-sm uppercase tracking-wide text-foreground">Why the restart?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This program is designed to build <em className="text-foreground/80 not-italic font-medium">unbreakable habits</em>. 
              Consistency is not optional—it's the foundation of a thriving book.
            </p>
            <p className="text-sm font-serif italic text-muted-foreground/80 pt-1">
              Things worth building are not easy.
            </p>
          </div>

          {/* Elegant divider */}
          <div className="flex items-center gap-4 py-1">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-oat/60 to-transparent" />
            <Sparkles className="h-3 w-3 text-oat-foreground/40" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-oat/60 to-transparent" />
          </div>

          <div className="space-y-3 relative">
            {/* Life Happens Pass Option - Premium styling */}
            {forgiveCreditsRemaining > 0 && daysMissed <= 1 && (
              <div className={`relative overflow-hidden rounded-xl p-5 space-y-4 transition-all duration-300 ${
                isExpired 
                  ? 'bg-muted/30 border border-border' 
                  : 'bg-gradient-to-br from-card via-card to-oat/30 border border-oat/40 shadow-lg'
              }`}>
                {/* Shine effect for active state */}
                {!isExpired && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />
                )}
                
                <div className="flex items-center justify-between relative">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isExpired 
                        ? 'bg-muted' 
                        : 'bg-gradient-to-br from-primary to-primary/80 shadow-md'
                    }`}>
                      <Shield className={`h-5 w-5 ${isExpired ? 'text-muted-foreground' : 'text-primary-foreground'}`} />
                    </div>
                    <span className={`font-medium ${isExpired ? 'text-muted-foreground' : 'text-foreground'}`}>
                      Use a Life Happens Pass
                    </span>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`font-medium ${
                      isExpired 
                        ? 'bg-muted text-muted-foreground' 
                        : 'bg-oat/60 text-oat-foreground border border-oat/50'
                    }`}
                  >
                    {forgiveCreditsRemaining} left
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Continue from where you left off without restarting. You only have 2 passes for the entire program.
                </p>
                
                {creditExpiresAt && !isExpired && (
                  <div className="bg-oat/20 rounded-lg px-3 py-2 border border-oat/30">
                    <LiveCountdown 
                      expiresAt={creditExpiresAt} 
                      onExpire={() => setIsExpired(true)}
                      className="text-oat-foreground"
                    />
                  </div>
                )}
                
                {isExpired && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                    Your window to use a pass has expired.
                  </p>
                )}
                
                <Button 
                  onClick={() => setShowConfirmDialog(true)} 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-300 hover:shadow-xl group overflow-hidden"
                  disabled={isLoading || isExpired}
                  size={tokens.button.hero}
                >
                  <Heart className="h-4 w-4 mr-2 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out" />
                  <span className="group-hover:translate-x-0 -translate-x-3 transition-transform duration-300 ease-out">Use Pass & Continue</span>
                </Button>
              </div>
            )}

            {forgiveCreditsRemaining === 0 && daysMissed === 1 && (
              <div className="rounded-xl p-4 bg-muted/30 border border-border">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Shield className="h-4 w-4" />
                  </div>
                  <span className="text-sm">No Life Happens Passes remaining</span>
                </div>
              </div>
            )}

            {/* Request Pause Option - Outlined premium style */}
            {!hasPendingPauseRequest && (
              <Button
                variant="outline"
                onClick={() => setView('pause')}
                className="w-full border-oat/50 hover:bg-oat/20 hover:border-oat transition-all duration-300"
                disabled={isLoading}
                size="lg"
              >
                <Pause className="mr-2 h-4 w-4" />
                Request Emergency Pause
              </Button>
            )}

            {hasPendingPauseRequest && (
              <div className="rounded-xl p-4 bg-gradient-to-r from-amber-50/80 to-oat/20 border border-amber-200/50 dark:from-amber-950/30 dark:to-oat/10 dark:border-amber-800/30">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  You have a pending pause request. Leadership is reviewing it.
                </p>
              </div>
            )}

            {/* Restart Option - Subtle secondary style */}
            <Button
              variant="ghost"
              onClick={handleRestart}
              className="w-full text-muted-foreground hover:text-foreground hover:bg-oat/20 transition-all duration-300"
              disabled={isLoading}
              size="lg"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restart from Day 1
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UsePassConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        passesRemaining={forgiveCreditsRemaining}
        onConfirm={handleUseCredit}
        isLoading={isLoading}
      />
    </>
  );
}
