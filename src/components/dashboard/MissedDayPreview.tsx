import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { AlertCircle, Heart, Pause, RotateCcw, Shield, Sparkles, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProgramConfig } from '@/hooks/useProgramConfig';

export function MissedDayPreview() {
  const { config } = useProgramConfig();
  
  // Preview state controls
  const [previewDaysMissed, setPreviewDaysMissed] = useState(1);
  const [previewPassesRemaining, setPreviewPassesRemaining] = useState(config?.life_happens_passes_total || 2);
  const [previewHasPendingPause, setPreviewHasPendingPause] = useState(false);
  const [previewIsExpired, setPreviewIsExpired] = useState(false);

  const graceHours = config?.grace_period_hours || 24;
  const totalPasses = config?.life_happens_passes_total || 2;
  const canUseCredit = previewPassesRemaining > 0 && previewDaysMissed <= 1 && !previewIsExpired;

  return (
    <div className="space-y-6">
      {/* Controls Panel */}
      <Card className="bg-gradient-to-br from-card to-oat/10 border-oat/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <Eye className="h-5 w-5 text-primary" />
            Preview Controls
          </CardTitle>
          <CardDescription>
            Adjust these settings to preview different states of the missed day dialog
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Days Missed: {previewDaysMissed}</Label>
              <Slider
                value={[previewDaysMissed]}
                onValueChange={([val]) => setPreviewDaysMissed(val)}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Life Happens Passes Remaining: {previewPassesRemaining}</Label>
              <Slider
                value={[previewPassesRemaining]}
                onValueChange={([val]) => setPreviewPassesRemaining(val)}
                min={0}
                max={totalPasses}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <Switch
                id="pending-pause"
                checked={previewHasPendingPause}
                onCheckedChange={setPreviewHasPendingPause}
              />
              <Label htmlFor="pending-pause" className="text-sm">Has Pending Pause Request</Label>
            </div>
            
            <div className="flex items-center gap-3">
              <Switch
                id="expired"
                checked={previewIsExpired}
                onCheckedChange={setPreviewIsExpired}
              />
              <Label htmlFor="expired" className="text-sm">Pass Expired</Label>
            </div>
          </div>

          <Button
            variant="outline"
            size={tokens.button.card}
            onClick={() => {
              setPreviewDaysMissed(1);
              setPreviewPassesRemaining(totalPasses);
              setPreviewHasPendingPause(false);
              setPreviewIsExpired(false);
            }}
            className="border-oat/50 hover:bg-oat/20"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card className="overflow-hidden border-2 border-dashed border-oat/50">
        <CardHeader className="bg-oat/20 border-b border-oat/30">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center justify-center min-h-[600px] bg-black/50 p-8">
            {/* Dialog Preview */}
            <div className="w-full max-w-md rounded-2xl border-none bg-gradient-to-b from-card via-card to-oat/20 shadow-2xl overflow-hidden relative">
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-oat/10 pointer-events-none" />
              
              <div className="p-6 space-y-5">
                {/* Header */}
                <div className="text-center space-y-4 relative">
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
                  
                  <h2 className="text-2xl font-display uppercase tracking-wider text-foreground">
                    You Missed {previewDaysMissed} Day{previewDaysMissed > 1 ? 's' : ''}
                  </h2>
                </div>

                <div className="text-center space-y-2 relative">
                  <p className="text-muted-foreground leading-relaxed text-sm">
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
                  {previewPassesRemaining > 0 && previewDaysMissed <= 1 && (
                    <div className={`relative overflow-hidden rounded-xl p-5 space-y-4 transition-all duration-300 ${
                      previewIsExpired 
                        ? 'bg-muted/30 border border-border' 
                        : 'bg-gradient-to-br from-card via-card to-oat/30 border border-oat/40 shadow-lg'
                    }`}>
                      {/* Shine effect for active state */}
                      {!previewIsExpired && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]" />
                      )}
                      
                      <div className="flex items-center justify-between relative">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            previewIsExpired 
                              ? 'bg-muted' 
                              : 'bg-gradient-to-br from-primary to-primary/80 shadow-md'
                          }`}>
                            <Shield className={`h-5 w-5 ${previewIsExpired ? 'text-muted-foreground' : 'text-primary-foreground'}`} />
                          </div>
                          <span className={`font-medium ${previewIsExpired ? 'text-muted-foreground' : 'text-foreground'}`}>
                            Use a Life Happens Pass
                          </span>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`font-medium ${
                            previewIsExpired 
                              ? 'bg-muted text-muted-foreground' 
                              : 'bg-oat/60 text-oat-foreground border border-oat/50'
                          }`}
                        >
                          {previewPassesRemaining} left
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Continue from where you left off without restarting. You only have {totalPasses} passes for the entire program.
                      </p>
                      
                      {!previewIsExpired && (
                        <div className="bg-oat/20 rounded-lg px-3 py-2 border border-oat/30">
                          <div className="flex items-center gap-2 text-sm text-oat-foreground">
                            <span className="font-medium">⏱️ {graceHours}:00:00</span>
                            <span className="text-muted-foreground">remaining to use this pass</span>
                          </div>
                        </div>
                      )}
                      
                      {previewIsExpired && (
                        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                          Your window to use a pass has expired.
                        </p>
                      )}
                      
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-300 hover:shadow-xl group overflow-hidden"
                        disabled={previewIsExpired}
                        size="lg"
                      >
                        <Heart className="h-4 w-4 mr-2 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out" />
                        <span className="group-hover:translate-x-0 -translate-x-3 transition-transform duration-300 ease-out">Use Pass & Continue</span>
                      </Button>
                    </div>
                  )}

                  {previewPassesRemaining === 0 && previewDaysMissed === 1 && (
                    <div className="rounded-xl p-4 bg-muted/30 border border-border">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Shield className="h-4 w-4" />
                        </div>
                        <span className="text-sm">No Life Happens Passes remaining</span>
                      </div>
                    </div>
                  )}

                  {/* Request Pause Option */}
                  {!previewHasPendingPause && (
                    <Button
                      variant="outline"
                      className="w-full border-oat/50 hover:bg-oat/20 hover:border-oat transition-all duration-300"
                      size="lg"
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Request Emergency Pause
                    </Button>
                  )}

                  {previewHasPendingPause && (
                    <div className="rounded-xl p-4 bg-gradient-to-r from-amber-50/80 to-oat/20 border border-amber-200/50 dark:from-amber-950/30 dark:to-oat/10 dark:border-amber-800/30">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        You have a pending pause request. Leadership is reviewing it.
                      </p>
                    </div>
                  )}

                  {/* Restart Option */}
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground hover:bg-oat/20 transition-all duration-300"
                    size="lg"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restart from Day 1
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Settings Info */}
      <Card className="bg-card border-oat/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Current Program Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-oat/10 border border-oat/20">
              <span className="text-sm text-muted-foreground">Grace Period</span>
              <Badge variant="secondary" className="bg-oat/40">{graceHours} hours</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-oat/10 border border-oat/20">
              <span className="text-sm text-muted-foreground">Total Passes</span>
              <Badge variant="secondary" className="bg-oat/40">{totalPasses} per enrollment</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            These settings can be changed in the Settings tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
