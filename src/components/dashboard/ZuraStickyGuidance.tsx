import { useState, useRef, useEffect } from 'react';
import { useZuraNavigationSafe } from '@/contexts/ZuraNavigationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ZuraAvatar } from '@/components/ui/ZuraAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ArrowLeft, ChevronUp, ChevronDown, Sparkles, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { normalizeGuidanceRoute } from '@/utils/guidanceRoutes';
import { useOrgDashboardPath } from '@/hooks/useOrgDashboardPath';

const SIDEBAR_COLLAPSED_KEY = 'dashboard-sidebar-collapsed';

export function ZuraStickyGuidance() {
  const { dashPath } = useOrgDashboardPath();
  const ctx = useZuraNavigationSafe();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(true);
  const navigatingRef = useRef(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    }
    return false;
  });

  // Listen for sidebar collapse changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SIDEBAR_COLLAPSED_KEY) {
        setSidebarCollapsed(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    // Also poll since same-tab localStorage changes don't fire storage events
    const interval = setInterval(() => {
      const val = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
      setSidebarCollapsed(prev => prev !== val ? val : prev);
    }, 500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Auto-dismiss when returning to dashboard (e.g. browser Back button)
  useEffect(() => {
    if (location.pathname === dashPath('/') && ctx?.savedState) {
      ctx.dismiss();
    }
  }, [location.pathname]);

  const isVisible = ctx?.savedState && location.pathname !== dashPath('/');
  const title = ctx?.savedState?.guidance.title ?? '';
  const guidanceText = ctx?.savedState?.guidanceText ?? '';

  const handleInternalLink = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (navigatingRef.current) return;
    if (ctx && ctx.savedState) {
      navigatingRef.current = true;
      setTimeout(() => { navigatingRef.current = false; }, 300);
      ctx.saveAndNavigate(normalizeGuidanceRoute(href), ctx.savedState);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className={cn(
            "fixed bottom-0 right-0 z-50",
            sidebarCollapsed ? 'lg:left-20' : 'lg:left-72',
            'left-0'
          )}
        >
          {/* Top gradient border */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

          <div className="bg-card/95 backdrop-blur-xl border-t border-border/40 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.15)]">
            {/* Collapsed bar */}
            <div className="flex items-center gap-3 px-4 lg:px-6 h-12">
              <button
                onClick={() => navigate(dashPath('/')}
                className="flex items-center gap-2.5 min-w-0 flex-1 group"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 group-hover:text-foreground transition-colors" />
                <ZuraAvatar size="sm" />
                <span className="text-xs font-medium truncate text-foreground/80 group-hover:text-foreground transition-colors">
                  {title}
                </span>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setExpanded(prev => !prev)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label={expanded ? 'Collapse guidance' : 'Expand guidance'}
                >
                  {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => ctx?.dismiss()}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="Dismiss guidance"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Expanded content */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border/40">
                    <ScrollArea className="max-h-[35vh]">
                      <div className="px-4 lg:px-6 py-4">
                        <div className="max-w-none text-sm text-foreground/90">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                              strong: ({ children }) => <strong className="font-medium text-foreground">{children}</strong>,
                              h3: ({ children }) => <h3 className="mt-4 mb-2 text-sm font-medium text-foreground">{children}</h3>,
                              h4: ({ children }) => <h4 className="mt-3 mb-1.5 text-sm font-medium text-foreground">{children}</h4>,
                              ul: ({ children }) => <ul className="mb-3 pl-5 space-y-1.5 list-disc marker:text-muted-foreground/50">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-3 pl-5 space-y-1.5 list-decimal marker:text-muted-foreground/50">{children}</ol>,
                              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                              a: ({ href, children }) => {
                                const isInternal = href?.startsWith(dashPath('/'));
                                if (isInternal && href) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={handleInternalLink(href)}
                                      className="inline-flex items-center gap-1 text-primary underline decoration-primary/40 hover:decoration-primary underline-offset-2 transition-colors font-medium"
                                    >
                                      {children}
                                      <ExternalLink className="w-3 h-3 inline-block opacity-50" />
                                    </button>
                                  );
                                }
                                return (
                                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                                    {children}
                                  </a>
                                );
                              },
                            }}
                          >
                            {guidanceText}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </ScrollArea>

                    <div className="px-4 lg:px-6 py-2 border-t border-border/30 flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-muted-foreground/40" />
                      <span className="text-[10px] text-muted-foreground/50">AI-generated guidance · Based on your data</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
