import { useState, useRef, useCallback, useEffect } from 'react';
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
  "My team keeps quitting",
  "I don't know which services are profitable",
  "Scheduling is a nightmare",
];

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
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderText, setPlaceholderText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  return (
    <section className="relative px-6 sm:px-8 py-16 sm:py-24 max-w-3xl mx-auto">
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
              <textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={handleKeyDown}
                placeholder="I'm struggling with..."
                disabled={isLoading}
                aria-label="Describe your salon challenge"
                className="w-full bg-transparent border-0 resize-none text-white placeholder:text-slate-500 font-sans text-lg focus:outline-none min-h-[80px] disabled:opacity-50"
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
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestionClick(s)}
                    className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full font-sans text-xs text-slate-400 hover:text-white hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
                  >
                    {s}
                  </button>
                ))}
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
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-6"
          >
            {/* Feature cards */}
            {features.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {features.map((f, i) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.3 }}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4"
                  >
                    <p className="font-display text-xs tracking-wide text-violet-400 mb-1">
                      {f.category}
                    </p>
                    <p className="font-sans text-sm text-white font-medium">
                      {f.name}
                    </p>
                    {f.tagline && (
                      <p className="font-sans text-xs text-slate-400 mt-1">
                        {f.tagline}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* AI response */}
            {response && (
              <div
                aria-live="polite"
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 sm:p-6"
              >
                <div className="prose prose-sm prose-invert max-w-none font-sans text-slate-400 [&_strong]:text-white [&_p]:text-slate-400 [&_li]:text-slate-400 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h1]:font-display [&_h2]:font-display [&_h3]:font-display [&_h1]:tracking-wide [&_h2]:tracking-wide [&_h3]:tracking-wide">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Reset */}
            {!isLoading && (
              <div className="flex items-center justify-center gap-4 mt-5">
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
                  className="inline-flex items-center gap-1.5 font-sans text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Book a demo
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
