import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { useFormatDate } from '@/hooks/useFormatDate';
import { cn } from '@/lib/utils';
import {
  Plus, Search, Calendar as CalendarIcon, Clock, Edit, Trash2, Send, Archive,
  Eye, Star, ChevronUp, MessageSquare, Link2, Filter, Rocket, Bug, Sparkles, Lightbulb
} from 'lucide-react';
import { DashboardPageHeader } from '@/components/dashboard/DashboardPageHeader';
import {
  useAdminChangelog, useCreateChangelog, useUpdateChangelog, usePublishChangelog, useDeleteChangelog,
  type ChangelogEntry, type CreateChangelogEntry
} from '@/hooks/useChangelog';
import {
  useFeatureRequests, useUpdateFeatureRequest, useDeleteFeatureRequest, useLinkToChangelog,
  FEATURE_CATEGORIES, FEATURE_STATUSES, type FeatureRequest
} from '@/hooks/useFeatureRequests';
import { useRoles } from '@/hooks/useRoles';

const ENTRY_TYPES = [
  { value: 'update', label: 'Update', icon: Sparkles, color: 'bg-blue-100 text-blue-700' },
  { value: 'feature', label: 'Feature', icon: Rocket, color: 'bg-green-100 text-green-700' },
  { value: 'bugfix', label: 'Bug Fix', icon: Bug, color: 'bg-red-100 text-red-700' },
  { value: 'improvement', label: 'Improvement', icon: Lightbulb, color: 'bg-amber-100 text-amber-700' },
  { value: 'coming_soon', label: 'Coming Soon', icon: Clock, color: 'bg-purple-100 text-purple-700' },
];

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700' },
  scheduled: { label: 'Scheduled', color: 'bg-amber-100 text-amber-700' },
  published: { label: 'Published', color: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-500' },
};

function ChangelogEntryCard({
  entry,
  onEdit,
  onPublish,
  onDelete,
}: {
  entry: ChangelogEntry;
  onEdit: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const { formatDate } = useFormatDate();
  const typeConfig = ENTRY_TYPES.find(t => t.value === entry.entry_type) || ENTRY_TYPES[0];
  const statusConfig = STATUS_BADGES[entry.status] || STATUS_BADGES.draft;
  const TypeIcon = typeConfig.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn('p-2 rounded-lg', typeConfig.color)}>
            <TypeIcon className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  {entry.is_major && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                  <h4 className="font-medium">
                    {entry.version && <span className="text-muted-foreground mr-2">{entry.version}</span>}
                    {entry.title}
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{entry.content}</p>
              </div>
              <Badge className={cn('shrink-0', statusConfig.color)}>
                {statusConfig.label}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {entry.entry_type === 'coming_soon' && (
                <span className="flex items-center gap-1">
                  <ChevronUp className="h-3 w-3" />
                  {entry.vote_count || 0} votes
                </span>
              )}
              {entry.scheduled_publish_at && entry.status === 'scheduled' && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Scheduled: {formatDate(new Date(entry.scheduled_publish_at), 'MMM d, yyyy h:mm a')}
                </span>
              )}
              {entry.published_at && entry.status === 'published' && (
                <span>Published {formatDate(new Date(entry.published_at), 'MMM d, yyyy')}</span>
              )}
              {entry.target_roles && entry.target_roles.length > 0 && (
                <span>Targets: {entry.target_roles.join(', ')}</span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size={tokens.button.inline} onClick={onEdit}>
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              {entry.status === 'draft' && (
                <Button variant="outline" size={tokens.button.inline} onClick={onPublish}>
                  <Send className="h-3 w-3 mr-1" />
                  Publish
                </Button>
              )}
              {entry.status === 'scheduled' && (
                <Button variant="outline" size={tokens.button.inline} onClick={onPublish}>
                  <Send className="h-3 w-3 mr-1" />
                  Publish Now
                </Button>
              )}
              <Button variant="ghost" size={tokens.button.inline} className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureRequestCard({
  request,
  onRespond,
  onUpdateStatus,
  onDelete,
}: {
  request: FeatureRequest;
  onRespond: () => void;
  onUpdateStatus: (status: string) => void;
  onDelete: () => void;
}) {
  const { formatDate } = useFormatDate();
  const statusConfig = FEATURE_STATUSES.find(s => s.value === request.status) || FEATURE_STATUSES[0];
  const categoryConfig = FEATURE_CATEGORIES.find(c => c.value === request.category);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1 text-center min-w-[48px]">
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-medium">{request.vote_count || 0}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium">{request.title}</h4>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{request.description}</p>
              </div>
              <Badge className={cn('shrink-0', statusConfig.color)}>
                {statusConfig.label}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{categoryConfig?.label || request.category}</span>
              <span>by {request.submitter_name}</span>
              <span>{formatDate(new Date(request.created_at), 'MMM d, yyyy')}</span>
            </div>

            {request.admin_response && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
                <p className="text-muted-foreground italic">"{request.admin_response}"</p>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size={tokens.button.inline} onClick={onRespond}>
                <MessageSquare className="h-3 w-3 mr-1" />
                {request.admin_response ? 'Edit Response' : 'Respond'}
              </Button>
              <Select value={request.status} onValueChange={onUpdateStatus}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEATURE_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size={tokens.button.inline} className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChangelogManager() {
  const { formatDate } = useFormatDate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialogs
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [respondingRequest, setRespondingRequest] = useState<FeatureRequest | null>(null);
  const [responseText, setResponseText] = useState('');
  const [deleteRequestConfirm, setDeleteRequestConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateChangelogEntry>({
    title: '',
    content: '',
    version: '',
    entry_type: 'update',
    is_major: false,
    target_roles: [],
    release_date: undefined,
    scheduled_publish_at: undefined,
    send_as_announcement: false,
    send_as_notification: true,
  });
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [useSchedule, setUseSchedule] = useState(false);

  // Hooks
  const { data: entries = [], isLoading: entriesLoading } = useAdminChangelog();
  const { data: requests = [], isLoading: requestsLoading } = useFeatureRequests();
  const { data: roles = [] } = useRoles();
  const createChangelog = useCreateChangelog();
  const updateChangelog = useUpdateChangelog();
  const publishChangelog = usePublishChangelog();
  const deleteChangelog = useDeleteChangelog();
  const updateFeatureRequest = useUpdateFeatureRequest();
  const deleteFeatureRequest = useDeleteFeatureRequest();

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Tab filter
      if (activeTab !== 'all' && activeTab !== 'requests') {
        if (activeTab === 'coming_soon' && entry.entry_type !== 'coming_soon') return false;
        if (activeTab === 'updates' && entry.entry_type === 'coming_soon') return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return entry.title.toLowerCase().includes(query) ||
               entry.content.toLowerCase().includes(query) ||
               (entry.version?.toLowerCase().includes(query));
      }
      
      return true;
    });
  }, [entries, activeTab, statusFilter, searchQuery]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    if (!searchQuery) return requests;
    const query = searchQuery.toLowerCase();
    return requests.filter(r => 
      r.title.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query)
    );
  }, [requests, searchQuery]);

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      version: '',
      entry_type: 'update',
      is_major: false,
      target_roles: [],
      release_date: undefined,
      scheduled_publish_at: undefined,
      send_as_announcement: false,
      send_as_notification: true,
    });
    setScheduleDate(undefined);
    setScheduleTime('09:00');
    setUseSchedule(false);
    setEditingEntry(null);
  };

  // Open edit dialog
  const handleEdit = (entry: ChangelogEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      version: entry.version || '',
      entry_type: entry.entry_type,
      is_major: entry.is_major,
      target_roles: entry.target_roles || [],
      release_date: entry.release_date || undefined,
      send_as_announcement: entry.send_as_announcement,
      send_as_notification: entry.send_as_notification,
    });
    if (entry.scheduled_publish_at) {
      setUseSchedule(true);
      const schedDate = new Date(entry.scheduled_publish_at);
      setScheduleDate(schedDate);
      setScheduleTime(format(schedDate, 'HH:mm'));
    }
    setShowEntryDialog(true);
  };

  // Save entry
  const handleSave = async () => {
    let scheduledAt: string | undefined;
    if (useSchedule && scheduleDate) {
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const combined = new Date(scheduleDate);
      combined.setHours(hours, minutes, 0, 0);
      scheduledAt = combined.toISOString();
    }

    const data = {
      ...formData,
      scheduled_publish_at: scheduledAt,
    };

    if (editingEntry) {
      await updateChangelog.mutateAsync({ id: editingEntry.id, ...data });
    } else {
      await createChangelog.mutateAsync(data);
    }

    setShowEntryDialog(false);
    resetForm();
  };

  // Respond to feature request
  const handleSaveResponse = async () => {
    if (!respondingRequest) return;
    await updateFeatureRequest.mutateAsync({
      id: respondingRequest.id,
      admin_response: responseText,
    });
    setShowResponseDialog(false);
    setRespondingRequest(null);
    setResponseText('');
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <DashboardPageHeader
          title="Changelog & Roadmap"
          description="Manage updates, features, and user feedback"
          actions={
            <Button onClick={() => { resetForm(); setShowEntryDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          }
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="updates">Updates</TabsTrigger>
              <TabsTrigger value="coming_soon">Coming Soon</TabsTrigger>
              <TabsTrigger value="requests" className="relative">
                Requests
                {requests.filter(r => r.status === 'submitted').length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 min-w-5 text-xs px-1.5">
                    {requests.filter(r => r.status === 'submitted').length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              {activeTab !== 'requests' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Changelog Entries */}
          <TabsContent value="all" className="space-y-4">
            {entriesLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No entries found</div>
            ) : (
              filteredEntries.map(entry => (
                <ChangelogEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => handleEdit(entry)}
                  onPublish={() => publishChangelog.mutate({ id: entry.id })}
                  onDelete={() => setDeleteConfirm(entry.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="updates" className="space-y-4">
            {filteredEntries.map(entry => (
              <ChangelogEntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => handleEdit(entry)}
                onPublish={() => publishChangelog.mutate({ id: entry.id })}
                onDelete={() => setDeleteConfirm(entry.id)}
              />
            ))}
          </TabsContent>

          <TabsContent value="coming_soon" className="space-y-4">
            {filteredEntries.map(entry => (
              <ChangelogEntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => handleEdit(entry)}
                onPublish={() => publishChangelog.mutate({ id: entry.id })}
                onDelete={() => setDeleteConfirm(entry.id)}
              />
            ))}
          </TabsContent>

          {/* Feature Requests */}
          <TabsContent value="requests" className="space-y-4">
            {requestsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No feature requests yet</div>
            ) : (
              filteredRequests.map(request => (
                <FeatureRequestCard
                  key={request.id}
                  request={request}
                  onRespond={() => {
                    setRespondingRequest(request);
                    setResponseText(request.admin_response || '');
                    setShowResponseDialog(true);
                  }}
                  onUpdateStatus={(status) => updateFeatureRequest.mutate({ id: request.id, status })}
                  onDelete={() => setDeleteRequestConfirm(request.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Entry Dialog */}
        <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEntry ? 'Edit Entry' : 'New Changelog Entry'}</DialogTitle>
              <DialogDescription>
                Create or update a changelog entry. Scheduled entries will be published automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Checkout Summary Improvements"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Version (optional)</Label>
                  <Input
                    value={formData.version}
                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="e.g., v1.3.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.entry_type}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, entry_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTRY_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Release Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.release_date ? formatDate(new Date(formData.release_date), 'PPP') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.release_date ? new Date(formData.release_date) : undefined}
                        onSelect={(d) => setFormData(prev => ({ ...prev, release_date: d?.toISOString().split('T')[0] }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Describe what's new or coming..."
                  rows={6}
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_major}
                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, is_major: c }))}
                  />
                  <Label>Major Release</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.send_as_notification}
                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, send_as_notification: c }))}
                  />
                  <Label>Send Notification</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.send_as_announcement}
                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, send_as_announcement: c }))}
                  />
                  <Label>Create Announcement</Label>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Switch checked={useSchedule} onCheckedChange={setUseSchedule} />
                  <Label>Schedule for later</Label>
                </div>
                
                {useSchedule && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduleDate ? formatDate(scheduleDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={scheduleDate}
                            onSelect={setScheduleDate}
                            disabled={(d) => d < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowEntryDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.title || !formData.content || createChangelog.isPending || updateChangelog.isPending}
              >
                {editingEntry ? 'Update' : useSchedule ? 'Schedule' : 'Save as Draft'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Response Dialog */}
        <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Respond to Feature Request</DialogTitle>
              <DialogDescription>
                Your response will be visible to all users.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium">{respondingRequest?.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{respondingRequest?.description}</p>
              </div>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your response..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResponseDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveResponse} disabled={updateFeatureRequest.isPending}>
                Save Response
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Changelog Confirm */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the changelog entry.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteConfirm) deleteChangelog.mutate(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Request Confirm */}
        <AlertDialog open={!!deleteRequestConfirm} onOpenChange={() => setDeleteRequestConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Feature Request?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the feature request.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteRequestConfirm) deleteFeatureRequest.mutate(deleteRequestConfirm);
                  setDeleteRequestConfirm(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
