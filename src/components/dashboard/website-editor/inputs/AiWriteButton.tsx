import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type AiFieldType =
  | 'hero_headline'
  | 'hero_subheadline'
  | 'brand_statement'
  | 'service_description'
  | 'cta_button'
  | 'eyebrow'
  | 'faq_answer'
  | 'rotating_words'
  | 'meta_description';

const TONE_OPTIONS = [
  { value: 'luxe', label: 'Luxe' },
  { value: 'warm', label: 'Warm' },
  { value: 'edgy', label: 'Edgy' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'playful', label: 'Playful' },
] as const;

const CONTEXT_STORAGE_KEY = 'zura-ai-writer-context';
const TONE_STORAGE_KEY = 'zura-ai-writer-tone';

interface AiWriteButtonProps {
  fieldType: AiFieldType;
  onAccept: (value: string) => void;
  currentValue?: string;
  maxLength?: number;
}

export function AiWriteButton({ fieldType, onAccept, currentValue, maxLength }: AiWriteButtonProps) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState(() => localStorage.getItem(CONTEXT_STORAGE_KEY) || '');
  const [tone, setTone] = useState(() => localStorage.getItem(TONE_STORAGE_KEY) || 'warm');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    localStorage.setItem(CONTEXT_STORAGE_KEY, context);
  }, [context]);

  useEffect(() => {
    localStorage.setItem(TONE_STORAGE_KEY, tone);
  }, [tone]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke('ai-content-writer', {
        body: {
          fieldType,
          context: context || undefined,
          tone,
          currentValue: currentValue || undefined,
        },
      });

      if (error) throw error;

      if (data?.suggestion) {
        const allSuggestions = [data.suggestion, ...(data.alternatives || [])].filter(Boolean);
        setSuggestions(allSuggestions);
        setSelectedIndex(0);
      } else {
        toast.error('No suggestions generated');
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to generate content';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (suggestions[selectedIndex]) {
      onAccept(suggestions[selectedIndex]);
      setOpen(false);
      setSuggestions([]);
      toast.success('AI copy applied');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center h-5 w-5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-medium">AI Write</p>
            <p className="text-xs text-muted-foreground">Generate copy with AI</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="end" side="bottom" className="w-80 p-0">
        <div className="p-4 space-y-3">
          {/* Context */}
          <div className="space-y-1.5">
            <Label className="text-xs">Salon Context</Label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. luxury color studio in Austin, TX targeting 25-45 professionals"
              rows={2}
              className="text-xs resize-none"
            />
            <p className="text-[10px] text-muted-foreground">Saved automatically for future use</p>
          </div>

          {/* Tone */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tone</Label>
            <div className="flex flex-wrap gap-1.5">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-sans transition-colors",
                    tone === t.value
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full font-sans"
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Generating…
              </>
            ) : suggestions.length > 0 ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Generate
              </>
            )}
          </Button>

          {/* Loading skeleton */}
          {isGenerating && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          )}

          {/* Suggestions */}
          {!isGenerating && suggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Pick a suggestion</Label>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg text-xs font-sans border transition-colors",
                    selectedIndex === i
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  {s}
                  {maxLength && (
                    <span className={cn(
                      "block text-[10px] font-mono mt-1",
                      s.length > maxLength ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {s.length}/{maxLength}
                    </span>
                  )}
                </button>
              ))}

              <Button onClick={handleAccept} size="sm" className="w-full font-sans">
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Use Selected
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
