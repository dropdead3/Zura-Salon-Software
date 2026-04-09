import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { tokens } from '@/lib/design-tokens';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Command, Sparkles, Users, BookOpen, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useTeamDirectory } from '@/hooks/useEmployeeProfile';
import ReactMarkdown from 'react-markdown';
import {
  mainNavItems,
  myToolsNavItems,
  manageNavItems,
  systemNavItems,
} from '@/config/dashboardNav';

// Hub children: deep pages inside hubs that should be searchable
const hubChildrenItems: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  // Operations Hub children
  { href: '/dashboard/directory', label: 'Team Directory', icon: Users },
  { href: '/dashboard/admin/performance-reviews', label: 'Performance Reviews', icon: Users },
  { href: '/dashboard/admin/pto', label: 'PTO Balances', icon: Users },
  { href: '/dashboard/admin/announcements', label: 'Announcements', icon: Users },
  { href: '/dashboard/admin/recruiting', label: 'Recruiting Pipeline', icon: Users },
  { href: '/dashboard/admin/graduation-tracker', label: 'Graduation Tracker', icon: Users },
  { href: '/dashboard/admin/stylist-levels', label: 'Stylist Levels', icon: Users },
  { href: '/dashboard/admin/headshots', label: 'Headshot Requests', icon: Users },
  { href: '/dashboard/admin/business-cards', label: 'Business Card Requests', icon: Users },
  { href: '/dashboard/schedule-meeting', label: 'Schedule 1:1', icon: Users },
  { href: '/dashboard/admin/training-hub', label: 'Training Hub', icon: Users },
  // Client Hub children
  { href: '/dashboard/clients', label: 'Client Directory', icon: Users },
  { href: '/dashboard/admin/client-health', label: 'Client Health', icon: Users },
  { href: '/dashboard/admin/reengagement', label: 'Re-engagement', icon: Users },
  { href: '/dashboard/admin/feedback', label: 'Client Feedback', icon: Users },
  // Growth Hub children
  { href: '/dashboard/campaigns', label: 'Campaigns', icon: Users },
  { href: '/dashboard/admin/seo-workshop', label: 'SEO Workshop', icon: Users },
  { href: '/dashboard/admin/leads', label: 'Lead Management', icon: Users },
  // Analytics Hub children
  { href: '/dashboard/appointments-hub', label: 'Appointments & Transactions', icon: Users },
  { href: '/dashboard/admin/sales', label: 'Sales Analytics', icon: Users },
  { href: '/dashboard/admin/operational-analytics', label: 'Operational Analytics', icon: Users },
  { href: '/dashboard/admin/staff-utilization', label: 'Staff Utilization', icon: Users },
  { href: '/dashboard/admin/reports', label: 'Reports', icon: Users },
  // Payroll Hub children
  { href: '/dashboard/admin/day-rate-settings', label: 'Day Rate Settings', icon: Users },
  { href: '/dashboard/admin/day-rate-calendar', label: 'Day Rate Calendar', icon: Users },
];

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  roles?: string[];
  platformRoles?: string[];
}

interface TopBarSearchProps {
  filterNavItems?: (items: NavItem[]) => NavItem[];
}

interface SearchResult {
  type: 'navigation' | 'help' | 'team';
  title: string;
  subtitle?: string;
  path?: string;
  icon: React.ReactNode;
}

function dedupeByPath(items: NavItem[]): NavItem[] {
  const map = new Map<string, NavItem>();
  items.forEach((item) => {
    if (!map.has(item.href)) map.set(item.href, item);
  });
  return Array.from(map.values());
}

export function TopBarSearch({ filterNavItems }: TopBarSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const { response: aiResponse, isLoading: aiLoading, error: aiError, sendMessage, reset: resetAI } = useAIAssistant();
  const { data: teamMembers } = useTeamDirectory();

  const navigationResults = React.useMemo((): SearchResult[] => {
    const derived = dedupeByPath([
      ...mainNavItems,
      ...myToolsNavItems,
      ...manageNavItems,
      ...systemNavItems,
      ...hubChildrenItems as any[],
    ]);

    const visible = filterNavItems ? filterNavItems(derived) : derived;

    const results: SearchResult[] = visible.map((item) => ({
      type: 'navigation',
      title: item.label,
      path: item.href,
      icon: <item.icon className="w-4 h-4" />,
    }));

    // Always-searchable essentials (not in the sidebar registry)
    results.push(
      { type: 'navigation', title: 'Profile', path: '/dashboard/profile', icon: <UserCircle className="w-4 h-4" /> },
      { type: 'help', title: 'Help Center', path: '/dashboard/help', icon: <BookOpen className="w-4 h-4" /> },
      { type: 'help', title: 'Handbooks', subtitle: 'Employee guides & resources', path: '/dashboard/handbooks', icon: <BookOpen className="w-4 h-4" /> },
      { type: 'help', title: "What's New", subtitle: 'Latest updates & features', path: '/dashboard/changelog', icon: <Sparkles className="w-4 h-4" /> }
    );

    return results;
  }, [filterNavItems]);

  // Filter results based on query
  const filteredResults = React.useMemo(() => {
    if (!query.trim() || aiMode) return [];
    
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];
    
    // Filter navigation items
    navigationResults.forEach(item => {
      const haystack = `${item.title} ${item.subtitle ?? ''}`.toLowerCase();
      if (haystack.includes(lowerQuery)) results.push(item);
    });
    
    // Filter team members
    teamMembers?.slice(0, 5).forEach(member => {
      const name = member.full_name || member.display_name || '';
      if (name.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'team',
          title: name,
          subtitle: member.roles?.[0] || 'Team Member',
          path: `/dashboard/directory?search=${encodeURIComponent(name)}`,
          icon: <Users className="w-4 h-4" />,
        });
      }
    });
    
    return results.slice(0, 8);
  }, [query, aiMode, teamMembers, navigationResults]);

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculate dropdown position when open
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const updatePos = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    };
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      resetAI();
    } else if (e.key === 'Tab' && !e.shiftKey && query === '') {
      e.preventDefault();
      setAiMode(!aiMode);
      resetAI();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (aiMode && query.trim()) {
        sendMessage(query);
      } else if (filteredResults[selectedIndex]) {
        const result = filteredResults[selectedIndex];
        if (result.path) {
          navigate(result.path);
          setIsOpen(false);
          setQuery('');
        }
      }
    }
  }, [aiMode, query, filteredResults, selectedIndex, navigate, resetAI, sendMessage]);

  const handleResultClick = (result: SearchResult) => {
    if (result.path) {
      navigate(result.path);
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleSubmitAI = () => {
    if (query.trim()) {
      sendMessage(query);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      {/* Search Trigger */}
      <button
        ref={triggerRef}
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border border-border",
          "bg-muted/50 hover:bg-muted transition-colors text-muted-foreground",
          "text-sm w-full justify-between"
        )}
      >
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          <span>Search...</span>
        </div>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Search Modal - Fixed position to escape overflow-hidden parent */}
      {isOpen && dropdownPos && (
        <div
          ref={dropdownRef}
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: Math.max(dropdownPos.width, 480) }}
          className="fixed bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-[200]"
        >
          {/* Search Input */}
          <div className="flex items-center gap-2 p-3 border-b border-border">
            {aiMode ? (
              <Sparkles className="w-4 h-4 text-primary" />
            ) : (
              <Search className="w-4 h-4 text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder={aiMode ? "Ask me anything..." : "Search navigation, team..."}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
              autoCapitalize="off"
            />
            <Button
              variant={aiMode ? "default" : "ghost"}
              size={tokens.button.inline}
              className="h-7 px-2 gap-1"
              onClick={() => {
                setAiMode(!aiMode);
                resetAI();
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-xs">AI</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setIsOpen(false);
                setQuery('');
                resetAI();
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Results / AI Response */}
          <div className="max-h-[400px] overflow-y-auto">
            {aiMode ? (
              <div className="p-4">
                {aiLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                )}
                {aiError && (
                  <div className="text-sm text-destructive p-2 bg-destructive/10 rounded">
                    {aiError}
                  </div>
                )}
                {aiResponse && (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{aiResponse}</ReactMarkdown>
                  </div>
                )}
                {!aiLoading && !aiResponse && !aiError && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary/50" />
                    <p>Ask me anything about the dashboard!</p>
                    <p className="text-xs mt-1">Press Enter to send your question</p>
                  </div>
                )}
                {query.trim() && !aiLoading && (
                  <Button 
                    onClick={handleSubmitAI} 
                    className="mt-3 w-full"
                    size={tokens.button.card}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Ask AI
                  </Button>
                )}
              </div>
            ) : (
              <>
                {filteredResults.length > 0 ? (
                  <div className="py-2">
                    {filteredResults.map((result, index) => (
                      <button
                        key={`${result.type}-${result.title}-${index}`}
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors",
                          selectedIndex === index 
                            ? "bg-accent text-accent-foreground" 
                            : "hover:bg-muted"
                        )}
                      >
                        <span className="text-muted-foreground">{result.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {result.type}
                        </Badge>
                      </button>
                    ))}
                  </div>
                ) : query.trim() ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <p>No results found</p>
                    <Button 
                      variant="link" 
                      size={tokens.button.inline} 
                      className="mt-1"
                      onClick={() => setAiMode(true)}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Try asking AI instead
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <p>Start typing to search...</p>
                    <p className="text-xs mt-1">
                      Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Tab</kbd> to toggle AI mode
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
