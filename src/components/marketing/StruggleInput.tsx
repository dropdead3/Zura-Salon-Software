import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Sparkles, RotateCcw, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { PLATFORM_NAME } from '@/lib/brand';

const MAX_CHARS = 300;
const COOLDOWN_MS = 30_000;
const SESSION_LIMIT = 5;
const SESSION_KEY = 'zura_demo_queries';

const DEMO_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/demo-assistant`;

const SUGGESTIONS = [
  "I can't track commissions accurately",
  "I want to run my commission salon better",
  "I need booth renter tracking and management",
  "I want custom commission levels per service and retail",
  "I need to track color bar costs per service",
  "I want an AI assistant to handle calls and scheduling",
  "My team keeps quitting",
  "I don't know which services are profitable",
  "Scheduling is a nightmare",
  "I want onboarding to feel more streamlined",
  "I want a training hub for each employee role",
  "I'm losing money on color and don't know how much",
  "I need to track exactly how much product goes on each head",
  "My stylists waste too much color",
  "I want to know my true cost per color service",
];

const DISPLAY_PILL_COUNT = 5;

type FeatureCard = {
  id: string;
  name: string;
  tagline?: string;
  category?: string;
  description?: string;
};

function getSessionCount(): number {
  try {
    return parseInt(localStorage.getItem(SESSION_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function incrementSessionCount(): number {
  const next = getSessionCount() + 1;
  try {
    localStorage.setItem(SESSION_KEY, String(next));
  } catch { /* noop */ }
  return next;
}

export function StruggleInput() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [features, setFeatures] = useState<FeatureCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [limitReached, setLimitReached] = useState(() => getSessionCount() >= SESSION_LIMIT);
  const [showAllPills, setShowAllPills] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayPills = useMemo(() => {
    const shuffled = [...SUGGESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, DISPLAY_PILL_COUNT);
  }, []);
  const responseRef = useRef<HTMLDivElement>(null);

  const isCoolingDown = Date.now() < cooldownUntil;
  const canSubmit = query.trim().length > 0 && !isLoading && !isCoolingDown && !limitReached;
  const showAnimatedPlaceholder = query === '' && !isFocused && !isLoading && !limitReached;

  // Typing animation effect
  useEffect(() => {
    if (!showAnimatedPlaceholder) {
      setPlaceholderText('');
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const animate = async () => {
      let index = 0;
      while (!cancelled) {
        const text = SUGGESTIONS[index % SUGGESTIONS.length];

        // Type in
        for (let i = 0; i <= text.length; i++) {
          if (cancelled) return;
          setPlaceholderText(text.slice(0, i));
          await new Promise(r => { timeoutId = setTimeout(r, 40); });
        }

        // Pause
        if (cancelled) return;
        await new Promise(r => { timeoutId = setTimeout(r, 2000); });

        // Delete
        for (let i = text.length; i >= 0; i--) {
          if (cancelled) return;
          setPlaceholderText(text.slice(0, i));
          await new Promise(r => { timeoutId = setTimeout(r, 25); });
        }

        // Brief pause before next
        if (cancelled) return;
        await new Promise(r => { timeoutId = setTimeout(r, 300); });

        index++;
      }
    };

    animate();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [showAnimatedPlaceholder]);

  // Cooldown tick
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => {
      if (Date.now() >= cooldownUntil) clearInterval(id);
      // Force re-render
      setCooldownUntil(prev => prev);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const handleSubmit = useCallback(async (text?: string) => {
    const q = (text || query).trim();
    if (!q || isLoading || limitReached) return;

    if (getSessionCount() >= SESSION_LIMIT) {
      setLimitReached(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse('');
    setFeatures([]);

    try {
      const resp = await fetch(DEMO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: q }] }),
      });

      if (resp.status === 429) {
        setError("You've sent too many requests. Please wait a few minutes and try again.");
        return;
      }

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({ error: 'Something went wrong' }));
        setError(data.error || 'Something went wrong');
        return;
      }

      if (!resp.body) {
        setError('No response received');
        return;
      }

      incrementSessionCount();

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);

            // Handle features metadata event
            if (parsed.type === 'features' && Array.isArray(parsed.features)) {
              setFeatures(parsed.features.map((f: any) => ({
                id: f.id,
                name: f.name,
                tagline: f.tagline,
                category: f.category,
                description: f.description,
              })));
              continue;
            }

            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
            }
          } catch { /* ignore */ }
        }
      }

      // Start cooldown
      setCooldownUntil(Date.now() + COOLDOWN_MS);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
      if (getSessionCount() >= SESSION_LIMIT) setLimitReached(true);
    }
  }, [query, isLoading, limitReached]);

  const handleReset = () => {
    setQuery('');
    setResponse('');
    setFeatures([]);
    setError(null);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) handleSubmit();
    }
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    handleSubmit(text);
  };

  const hasResponse = response.length > 0 || features.length > 0;

  // Auto-collapse timer (15s after response finishes)
  const AUTO_COLLAPSE_MS = 15_000;
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseStartRef = useRef<number>(0);
  const remainingRef = useRef<number>(AUTO_COLLAPSE_MS);
  const [isHoveringResponse, setIsHoveringResponse] = useState(false);
  const [collapseActive, setCollapseActive] = useState(false);

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const startCollapseTimer = useCallback((duration: number) => {
    clearCollapseTimer();
    remainingRef.current = duration;
    collapseStartRef.current = Date.now();
    setCollapseActive(true);
    collapseTimerRef.current = setTimeout(() => {
      handleReset();
      setCollapseActive(false);
    }, duration);
  }, [clearCollapseTimer]);

  // Start timer when response finishes loading
  useEffect(() => {
    if (!isLoading && hasResponse) {
      startCollapseTimer(AUTO_COLLAPSE_MS);
    }
    if (!hasResponse) {
      clearCollapseTimer();
      setCollapseActive(false);
    }
    return () => clearCollapseTimer();
  }, [isLoading, hasResponse]);

  // Pause on hover, resume on leave
  const handleResponseMouseEnter = useCallback(() => {
    setIsHoveringResponse(true);
    if (collapseTimerRef.current) {
      const elapsed = Date.now() - collapseStartRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
      clearCollapseTimer();
    }
  }, [clearCollapseTimer]);

  const handleResponseMouseLeave = useCallback(() => {
    setIsHoveringResponse(false);
    if (hasResponse && !isLoading && remainingRef.current > 0) {
      startCollapseTimer(remainingRef.current);
    }
  }, [hasResponse, isLoading, startCollapseTimer]);

  return (
    <section className="relative px-6 sm:px-8 py-16 sm:py-24 max-w-4xl mx-auto">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <h2 className="font-display text-2xl sm:text-3xl tracking-wide text-white mb-3">
          What's holding you back?
        </h2>
        <p className="font-sans text-base text-slate-400 max-w-lg mx-auto">
          Tell us your biggest salon challenge. We'll show you exactly how {PLATFORM_NAME} solves it.
        </p>
      </motion.div>

      {/* Input card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 sm:p-6 backdrop-blur-sm"
      >
        {limitReached ? (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-violet-400 mx-auto mb-4" />
            <p className="font-sans text-lg text-white mb-2">
              You've explored a few solutions — want to see the full picture?
            </p>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-full font-sans text-sm hover:from-violet-500 hover:to-purple-500 transition-all"
            >
              <Calendar className="w-4 h-4" />
              Book a Demo
            </Link>
          </div>
        ) : (
          <>
            <div className="relative">
              {/* Animated typing placeholder */}
              {showAnimatedPlaceholder && (
                <div
                  className="absolute inset-0 pointer-events-none font-sans text-lg text-slate-500 whitespace-pre-wrap py-[2px]"
                  aria-hidden="true"
                >
                  {placeholderText}
                  <span className="animate-pulse">|</span>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={isLoading}
                aria-label="Describe your salon challenge"
                className="w-full bg-transparent border-0 resize-none text-white font-sans text-lg focus:outline-none min-h-[80px] disabled:opacity-50 relative z-10"
                rows={3}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="font-sans text-xs text-slate-600">
                  {query.length}/{MAX_CHARS}
                </span>
                <button
                  onClick={() => handleSubmit()}
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-full font-sans text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:from-violet-500 hover:to-purple-500 transition-all active:scale-[0.98]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Thinking…
                    </>
                  ) : (
                    <>
                      Show me how
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Suggestion pills */}
            {!hasResponse && !isLoading && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                <AnimatePresence mode="popLayout">
                  {(showAllPills ? SUGGESTIONS : displayPills).map((s) => (
                    <motion.button
                      key={s}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handleSuggestionClick(s)}
                      className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full font-sans text-xs text-slate-400 hover:text-white hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
                    >
                      {s}
                    </motion.button>
                  ))}
                </AnimatePresence>
                {!showAllPills && SUGGESTIONS.length > DISPLAY_PILL_COUNT && (
                  <button
                    onClick={() => setShowAllPills(true)}
                    className="px-3 py-1.5 border border-dashed border-white/[0.12] rounded-full font-sans text-xs text-violet-400 hover:text-violet-300 hover:border-violet-500/30 transition-all"
                  >
                    + See more problems
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 font-sans text-sm text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streaming response */}
      <AnimatePresence>
        {hasResponse && (
          <motion.div
            ref={responseRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onMouseEnter={handleResponseMouseEnter}
            onMouseLeave={handleResponseMouseLeave}
            transition={{ duration: 0.4 }}
            className="mt-6"
          >
            {/* Unified response card */}
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-5">
              {/* Primary feature hero card */}
              {features.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/20 rounded-xl p-5 overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500 rounded-l-xl" />
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-[10px] tracking-[0.12em] text-violet-400 mb-1">
                        {features[0].category?.toUpperCase() || 'FEATURED SOLUTION'}
                      </p>
                      <p className="font-sans text-lg text-white font-medium leading-tight">
                        {features[0].name}
                      </p>
                      {features[0].tagline && (
                        <p className="font-sans text-sm text-slate-400 mt-1.5 leading-relaxed">
                          {features[0].tagline}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Secondary features as compact chips */}
              {features.length > 1 && (
                <div>
                  <p className="font-sans text-xs text-slate-500 mb-2">Also relevant</p>
                  <div className="flex flex-wrap gap-2">
                    {features.slice(1).map((f, i) => (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + i * 0.08, duration: 0.25 }}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg"
                      >
                        <span className="font-display text-[9px] tracking-[0.1em] text-violet-400/70">
                          {f.category?.toUpperCase()}
                        </span>
                        <span className="font-sans text-sm text-slate-300">{f.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section divider + AI response */}
              {response && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-violet-500/20 to-transparent" />
                    <span className="font-display text-[10px] tracking-[0.12em] text-violet-400/60">
                      HOW {PLATFORM_NAME.toUpperCase()} SOLVES THIS
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-violet-500/20 to-transparent" />
                  </div>

                  <div
                    aria-live="polite"
                    className="prose prose-sm prose-invert max-w-none font-sans leading-relaxed text-slate-400 [&_strong]:text-violet-300 [&_p]:text-slate-400 [&_li]:text-slate-400 [&_li::marker]:text-violet-500/50 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_h1]:tracking-wide [&_h2]:tracking-wide [&_h3]:tracking-wide [&_ul]:space-y-1.5"
                  >
                    <ReactMarkdown>{response}</ReactMarkdown>
                  </div>
                </>
              )}

              {/* Action row */}
              {!isLoading && (
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <button
                    onClick={handleReset}
                    disabled={isCoolingDown}
                    className="inline-flex items-center gap-1.5 font-sans text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Ask another question
                  </button>
                  <Link
                    to="/demo"
                    className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-full font-sans text-sm hover:from-violet-500 hover:to-purple-500 transition-all active:scale-[0.98]"
                  >
                    Book a Demo
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
