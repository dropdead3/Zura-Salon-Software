import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { parseISO, isThisYear } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';
import {
  ChevronUp, Star, Clock, Rocket, Bug, Sparkles, Lightbulb,
  LayoutList, GitBranch, MessageSquare, Send, ThumbsUp, ChevronRight
} from 'lucide-react';
import {
  usePublishedChangelog, useMarkChangelogRead, useVoteChangelog,
  type ChangelogEntry
} from '@/hooks/useChangelog';
import {
  useFeatureRequests, useSubmitFeatureRequest, useVoteFeatureRequest,
  FEATURE_CATEGORIES, type FeatureRequest
} from '@/hooks/useFeatureRequests';
import { ChangelogTimeline } from '@/components/dashboard/ChangelogTimeline';
import { MobileChangelogViewer } from '@/components/dashboard/MobileChangelogViewer';
import { MobileFeatureRequestViewer } from '@/components/dashboard/MobileFeatureRequestViewer';
import { ChangelogFAB } from '@/components/dashboard/ChangelogFAB';
import { MobileSubmitDrawer } from '@/components/dashboard/MobileSubmitDrawer';
import { ChangelogSearchFilter, filterChangelogEntries, type ChangelogFilters } from '@/components/dashboard/ChangelogSearchFilter';
import { useIsMobile } from '@/hooks/use-mobile';

const ENTRY_TYPE_CONFIG: Record<string, { icon: typeof Sparkles; label: string; color: string }> = {
  update: { icon: Sparkles, label: 'Update', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  feature: { icon: Rocket, label: 'Feature', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  bugfix: { icon: Bug, label: 'Bug Fix', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  improvement: { icon: Lightbulb, label: 'Improvement', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  coming_soon: { icon: Clock, label: 'Coming Soon', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
};

// Desktop changelog entry card
function ChangelogEntryCard({
  entry,
  onVote,
}: {
  entry: ChangelogEntry;
  onVote?: () => void;
}) {
  const typeConfig = ENTRY_TYPE_CONFIG[entry.entry_type] || ENTRY_TYPE_CONFIG.update;
  const TypeIcon = typeConfig.icon;
  const markRead = useMarkChangelogRead();
  const { formatDate } = useFormatDate();

  useEffect(() => {
    if (!entry.is_read) {
      markRead.mutate(entry.id);
    }
  }, [entry.id, entry.is_read]);

  const formatEntryDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return isThisYear(date) ? formatDate(date, 'MMMM d') : formatDate(date, 'MMMM d, yyyy');
  };

  return (
    <Card className={cn(
      'transition-all',
      !entry.is_read && 'ring-2 ring-primary/20'
    )}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {entry.entry_type === 'coming_soon' && onVote && (
            <button
              onClick={onVote}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors',
                entry.user_voted
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              <ChevronUp className="h-5 w-5" />
              <span className="text-sm font-medium">{entry.vote_count || 0}</span>
            </button>
          )}
          
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-2 mb-2">
              {entry.is_major && (
                <Star className="h-5 w-5 text-amber-500 fill-amber-500 shrink-0" />
              )}
              {!entry.is_read && (
                <Badge variant="default" className="text-xs">NEW</Badge>
              )}
              <Badge className={cn('text-xs', typeConfig.color)}>
                <TypeIcon className="h-3 w-3 mr-1" />
                {typeConfig.label}
              </Badge>
              {entry.version && (
                <Badge variant="outline" className="text-xs">{entry.version}</Badge>
              )}
            </div>

            <h3 className="text-lg font-medium mb-2">{entry.title}</h3>
            
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground whitespace-pre-wrap">{entry.content}</p>
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              {entry.published_at && (
                <span>{formatEntryDate(entry.published_at)}</span>
              )}
              {entry.release_date && entry.entry_type === 'coming_soon' && (
                <span>Expected: {formatEntryDate(entry.release_date)}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mobile compact changelog entry card
function MobileChangelogCard({
  entry,
  onClick,
}: {
  entry: ChangelogEntry;
  onClick: () => void;
}) {
  const typeConfig = ENTRY_TYPE_CONFIG[entry.entry_type] || ENTRY_TYPE_CONFIG.update;
  const TypeIcon = typeConfig.icon;
  const { formatDate } = useFormatDate();

  const formatEntryDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return formatDate(date, 'MMM d');
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border bg-card transition-all active:scale-[0.98]',
        !entry.is_read && 'ring-2 ring-primary/20'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {entry.is_major && (
              <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
            )}
            {!entry.is_read && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">NEW</Badge>
            )}
            <Badge className={cn('text-[10px] px-1.5 py-0', typeConfig.color)}>
              <TypeIcon className="h-2.5 w-2.5 mr-0.5" />
              {typeConfig.label}
            </Badge>
          </div>
          <h4 className="font-medium line-clamp-1">{entry.title}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{entry.content}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {entry.published_at && formatEntryDate(entry.published_at)}
            {entry.version && <> • {entry.version}</>}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
      </div>
    </button>
  );
}

// Desktop feature request card
function FeatureRequestCard({
  request,
  onVote,
}: {
  request: FeatureRequest;
  onVote: () => void;
}) {
  const categoryConfig = FEATURE_CATEGORIES.find(c => c.value === request.category);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <button
            onClick={onVote}
            className={cn(
              'flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors',
              request.user_voted
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted text-muted-foreground'
            )}
          >
            <ChevronUp className="h-5 w-5" />
            <span className="text-sm font-medium">{request.vote_count || 0}</span>
          </button>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium">{request.title}</h4>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{request.description}</p>
            
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {categoryConfig?.label || request.category}
              </Badge>
              <span>by {request.submitter_name}</span>
            </div>

            {request.admin_response && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm border-l-2 border-primary">
                <p className="text-muted-foreground">{request.admin_response}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mobile compact feature request card
function MobileFeatureRequestCard({
  request,
  onClick,
  onVote,
}: {
  request: FeatureRequest;
  onClick: () => void;
  onVote: () => void;
}) {
  const categoryConfig = FEATURE_CATEGORIES.find(c => c.value === request.category);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-card">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onVote();
        }}
        className={cn(
          'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors shrink-0',
          request.user_voted
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        )}
      >
        <ChevronUp className="h-4 w-4" />
        <span className="text-xs font-medium">{request.vote_count || 0}</span>
      </button>
      
      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <h4 className="font-medium text-sm line-clamp-1">{request.title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {categoryConfig?.label || request.category} • {request.submitter_name}
        </p>
      </button>
      
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}

export default function Changelog() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'list' | 'timeline'>('list');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [newRequest, setNewRequest] = useState({ title: '', description: '', category: 'general' });
  
  // Search and filter state
  const [filters, setFilters] = useState<ChangelogFilters>({
    keyword: '',
    types: [],
    dateFrom: undefined,
    dateTo: undefined,
  });
  
  // Mobile viewer states
  const [changelogViewerOpen, setChangelogViewerOpen] = useState(false);
  const [changelogViewerIndex, setChangelogViewerIndex] = useState(0);
  const [requestViewerOpen, setRequestViewerOpen] = useState(false);
  const [requestViewerIndex, setRequestViewerIndex] = useState(0);

  const { data: entries = [], isLoading: entriesLoading } = usePublishedChangelog();
  const { data: requests = [], isLoading: requestsLoading } = useFeatureRequests();
  const voteChangelog = useVoteChangelog();
  const voteRequest = useVoteFeatureRequest();
  const submitRequest = useSubmitFeatureRequest();

  // Filter entries based on search/filters
  const filteredEntries = useMemo(() => 
    filterChangelogEntries(entries, filters), 
    [entries, filters]
  );

  // Split filtered entries
  const recentUpdates = useMemo(() => 
    filteredEntries.filter(e => e.entry_type !== 'coming_soon'),
    [filteredEntries]
  );
  const comingSoon = useMemo(() => 
    filteredEntries.filter(e => e.entry_type === 'coming_soon'),
    [filteredEntries]
  );

  // Top voted requests (not completed/declined)
  const topRequests = [...requests]
    .filter(r => !['completed', 'declined'].includes(r.status))
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    .slice(0, 5);
  
  const hasActiveFilters = filters.keyword || filters.types.length > 0 || filters.dateFrom || filters.dateTo;

  const handleSubmitRequest = async () => {
    if (!newRequest.title || !newRequest.description) return;
    await submitRequest.mutateAsync(newRequest);
    setShowSubmitDialog(false);
    setNewRequest({ title: '', description: '', category: 'general' });
  };

  const handleChangelogVote = (entry: ChangelogEntry) => {
    voteChangelog.mutate({
      changelogId: entry.id,
      vote: !entry.user_voted,
    });
  };

  const handleRequestVote = (request: FeatureRequest) => {
    voteRequest.mutate({
      requestId: request.id,
      vote: !request.user_voted,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <DashboardPageHeader
          title="WHAT'S NEW"
          description="Stay updated on the latest features"
          className="mb-6"
          actions={
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border bg-muted p-1">
                <Button
                  variant={activeTab === 'list' ? 'secondary' : 'ghost'}
                  size={tokens.button.card}
                  onClick={() => setActiveTab('list')}
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  <LayoutList className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </Button>
                <Button
                  variant={activeTab === 'timeline' ? 'secondary' : 'ghost'}
                  size={tokens.button.card}
                  onClick={() => setActiveTab('timeline')}
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  <GitBranch className="h-4 w-4" />
                  <span className="hidden sm:inline">Timeline</span>
                </Button>
              </div>
            </div>
          }
        />

        {activeTab === 'list' ? (
          <div className="space-y-8">
            {/* Search and Filter */}
            <ChangelogSearchFilter
              filters={filters}
              onFiltersChange={setFilters}
              resultCount={filteredEntries.length}
              totalCount={entries.length}
            />

            {/* Recent Updates */}
            <section>
              <h2 className="text-base sm:text-lg font-medium mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {hasActiveFilters ? 'Search Results' : 'Recent Updates'}
                {hasActiveFilters && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({recentUpdates.length} updates)
                  </span>
                )}
              </h2>
              {entriesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : recentUpdates.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    {hasActiveFilters ? 'No updates match your filters.' : 'No updates yet. Check back soon!'}
                  </CardContent>
                </Card>
              ) : isMobile ? (
                <div className="space-y-3">
                  {recentUpdates.map((entry, index) => (
                    <MobileChangelogCard
                      key={entry.id}
                      entry={entry}
                      onClick={() => {
                        setChangelogViewerIndex(index);
                        setChangelogViewerOpen(true);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentUpdates.map(entry => (
                    <ChangelogEntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </section>

            {/* Coming Soon - only show if not filtering by types that exclude coming_soon, or if there are results */}
            {(comingSoon.length > 0 || (!hasActiveFilters && !entriesLoading)) && comingSoon.length > 0 && (
              <section>
                <h2 className="text-base sm:text-lg font-medium mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-500" />
                  Coming Soon
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2">
                    Vote to help prioritize!
                  </span>
                  {hasActiveFilters && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({comingSoon.length})
                    </span>
                  )}
                </h2>
                {isMobile ? (
                  <div className="space-y-3">
                    {comingSoon.map((entry, index) => (
                      <MobileChangelogCard
                        key={entry.id}
                        entry={entry}
                        onClick={() => {
                          setChangelogViewerIndex(recentUpdates.length + index);
                          setChangelogViewerOpen(true);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comingSoon.map(entry => (
                      <ChangelogEntryCard
                        key={entry.id}
                        entry={entry}
                        onVote={() => handleChangelogVote(entry)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Top Feature Requests */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-medium flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-blue-500" />
                  Top Feature Requests
                </h2>
                {!isMobile && (
                  <Button variant="outline" size={tokens.button.card} onClick={() => setShowSubmitDialog(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Submit Idea
                  </Button>
                )}
              </div>
              
              {requestsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : topRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">No feature requests yet. Be the first!</p>
                    <Button onClick={() => isMobile ? setShowMobileDrawer(true) : setShowSubmitDialog(true)}>
                      <Send className="h-4 w-4 mr-2" />
                      Submit a Request
                    </Button>
                  </CardContent>
                </Card>
              ) : isMobile ? (
                <div className="space-y-2">
                  {topRequests.map((request, index) => (
                    <MobileFeatureRequestCard
                      key={request.id}
                      request={request}
                      onClick={() => {
                        setRequestViewerIndex(index);
                        setRequestViewerOpen(true);
                      }}
                      onVote={() => handleRequestVote(request)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {topRequests.map(request => (
                    <FeatureRequestCard
                      key={request.id}
                      request={request}
                      onVote={() => handleRequestVote(request)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <ChangelogTimeline entries={entries} />
        )}

        {/* Desktop Submit Feature Request Dialog */}
        <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit a Feature Request</DialogTitle>
              <DialogDescription>
                Have an idea to improve the platform? Share it with us!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={newRequest.title}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Client Photo Gallery"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newRequest.category}
                  onValueChange={(v) => setNewRequest(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEATURE_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={newRequest.description}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your idea and how it would help..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
              <Button
                onClick={handleSubmitRequest}
                disabled={!newRequest.title || !newRequest.description || submitRequest.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mobile-specific components */}
        {isMobile && (
          <>
            {/* FAB for quick submission */}
            <ChangelogFAB onClick={() => setShowMobileDrawer(true)} />

            {/* Mobile drawer for submission */}
            <MobileSubmitDrawer
              open={showMobileDrawer}
              onOpenChange={setShowMobileDrawer}
            />

            {/* Fullscreen changelog viewer */}
            <MobileChangelogViewer
              entries={[...recentUpdates, ...comingSoon]}
              open={changelogViewerOpen}
              initialIndex={changelogViewerIndex}
              onClose={() => setChangelogViewerOpen(false)}
              onVote={handleChangelogVote}
            />

            {/* Fullscreen feature request viewer */}
            <MobileFeatureRequestViewer
              requests={topRequests}
              open={requestViewerOpen}
              initialIndex={requestViewerIndex}
              onClose={() => setRequestViewerOpen(false)}
              onVote={handleRequestVote}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
