import { useState, useEffect, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import type { Json } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Mail,
  Pencil,
  Trash2,
  Eye,
  Save,
  Loader2,
  Send,
  Copy,
  Plus,
  MoreHorizontal,
  RefreshCw,
  Monitor,
  Smartphone,
  
  Instagram,
  X,
} from 'lucide-react';
import {
  useEmailTemplates,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
  useCreateEmailTemplate,
  EmailTemplate,
} from '@/hooks/useEmailTemplates';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { EmailTemplateEditor, type EmailTemplateEditorRef } from './EmailTemplateEditor';

// Default HTML for new templates
function getDefaultEmailHtml() {
  return `<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #1a1a1a; padding: 24px; text-align: center;">
    <h1 style="color: #f5f0e8; margin: 0; font-size: 24px;">Email Title</h1>
  </div>
  <div style="background-color: #f5f0e8; padding: 24px;">
    <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6;">
      Your email content goes here. Use the visual editor to customize this template.
    </p>
  </div>
  <div style="background-color: #f5f0e8; padding: 24px; text-align: center;">
    <a href="{{dashboard_url}}" style="display: inline-block; background-color: #1a1a1a; color: #f5f0e8; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
      Click Here
    </a>
  </div>
</div>`;
}

export function EmailTemplatesManager() {
  const { data: templates, isLoading } = useEmailTemplates();
  const updateTemplate = useUpdateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();
  const createTemplate = useCreateEmailTemplate();
  const { user } = useAuth();

  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [testEmailTemplate, setTestEmailTemplate] = useState<EmailTemplate | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    subject: '',
    html_body: '',
    blocks_json: null as Json | null,
    description: '',
    is_active: true,
  });
  const [createForm, setCreateForm] = useState({
    template_key: '',
    name: '',
    subject: '',
    html_body: getDefaultEmailHtml(),
    description: '',
    variables: [] as string[],
  });
  const [newVariable, setNewVariable] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  const initialEditFormRef = useRef<typeof editForm | null>(null);
  const hasShownUnsavedToastRef = useRef(false);
  const editorRef = useRef<EmailTemplateEditorRef>(null);

  const openEditDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    const formData = {
      name: template.name,
      subject: template.subject,
      html_body: template.html_body,
      blocks_json: template.blocks_json,
      description: template.description || '',
      is_active: template.is_active,
    };
    setEditForm(formData);
    initialEditFormRef.current = formData;
    setHasUnsavedChanges(false);
    hasShownUnsavedToastRef.current = false;
  };

  // Track unsaved changes in edit form
  useEffect(() => {
    if (!editingTemplate || !initialEditFormRef.current) return;
    
    const hasChanges = 
      editForm.name !== initialEditFormRef.current.name ||
      editForm.subject !== initialEditFormRef.current.subject ||
      editForm.html_body !== initialEditFormRef.current.html_body ||
      editForm.description !== initialEditFormRef.current.description ||
      editForm.is_active !== initialEditFormRef.current.is_active ||
      JSON.stringify(editForm.blocks_json) !== JSON.stringify(initialEditFormRef.current.blocks_json);
    
    setHasUnsavedChanges(hasChanges);
    
    // Show toast once when changes are first detected
    if (hasChanges && !hasShownUnsavedToastRef.current) {
      toast.info('You have unsaved changes', { 
        id: 'unsaved-changes',
        duration: 3000 
      });
      hasShownUnsavedToastRef.current = true;
    }
  }, [editForm, editingTemplate]);

  const openTestEmailDialog = (template: EmailTemplate) => {
    setTestEmailTemplate(template);
    // Pre-fill with user's email if available
    setTestEmailAddress(user?.email || '');
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    await updateTemplate.mutateAsync({
      id: editingTemplate.id,
      updates: editForm,
    });
    setHasUnsavedChanges(false);
    toast.success('Changes have been successfully saved');
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate.mutateAsync(id);
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    setIsDuplicating(template.id);
    try {
      // Generate a unique template key
      const baseKey = template.template_key.replace(/_copy(_\d+)?$/, '');
      const existingKeys = templates?.map(t => t.template_key) || [];
      let newKey = `${baseKey}_copy`;
      let counter = 1;
      while (existingKeys.includes(newKey)) {
        newKey = `${baseKey}_copy_${counter}`;
        counter++;
      }

      await createTemplate.mutateAsync({
        template_key: newKey,
        name: `${template.name} (Copy)`,
        subject: template.subject,
        html_body: template.html_body,
        description: template.description || undefined,
        variables: template.variables,
      });
      
      toast.success(`Template duplicated as "${template.name} (Copy)"`);
    } catch (error) {
      console.error('Error duplicating template:', error);
    } finally {
      setIsDuplicating(null);
    }
  };

  const openCreateDialog = () => {
    setCreateForm({
      template_key: '',
      name: '',
      subject: '',
      html_body: getDefaultEmailHtml(),
      description: '',
      variables: ['dashboard_url'],
    });
    setNewVariable('');
    setIsCreating(true);
  };

  const handleCreate = async () => {
    if (!createForm.template_key || !createForm.name || !createForm.subject) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check for duplicate template key
    const existingKeys = templates?.map(t => t.template_key) || [];
    if (existingKeys.includes(createForm.template_key)) {
      toast.error('Template key already exists. Please use a unique key.');
      return;
    }

    try {
      await createTemplate.mutateAsync({
        template_key: createForm.template_key,
        name: createForm.name,
        subject: createForm.subject,
        html_body: createForm.html_body,
        description: createForm.description || undefined,
        variables: createForm.variables,
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const addVariable = () => {
    if (!newVariable.trim()) return;
    const formatted = newVariable.trim().toLowerCase().replace(/\s+/g, '_');
    if (createForm.variables.includes(formatted)) {
      toast.error('Variable already exists');
      return;
    }
    setCreateForm(prev => ({
      ...prev,
      variables: [...prev.variables, formatted],
    }));
    setNewVariable('');
  };

  const removeVariable = (variable: string) => {
    setCreateForm(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable),
    }));
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTemplate || !testEmailAddress) return;

    setIsSendingTest(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await supabase.functions.invoke('send-test-email', {
        body: {
          template_id: testEmailTemplate.id,
          recipient_email: testEmailAddress,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send test email');
      }

      toast.success(`Test email sent to ${testEmailAddress}`);
      setTestEmailTemplate(null);
      setTestEmailAddress('');
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  };

  const renderPreviewHtml = (html: string, variables: string[]) => {
    let preview = html;
    variables.forEach((variable) => {
      const placeholder = `[Sample ${variable}]`;
      preview = preview.replace(new RegExp(`{{${variable}}}`, 'g'), placeholder);
    });
    return preview;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-sans">
          Customize email templates for automated notifications.
        </p>
        <Button onClick={openCreateDialog} size={tokens.button.card} className="gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {templates?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No email templates configured.</p>
            <Button onClick={openCreateDialog} variant="outline" className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates?.map((template) => (
            <div
              key={template.id}
              className={cn(
                "group flex items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
                !template.is_active && 'opacity-50'
              )}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">{template.name}</h3>
                  {!template.is_active && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Inactive
                    </Badge>
                  )}
                </div>
                {template.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {template.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/70 truncate">
                  {template.subject}
                </p>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size={tokens.button.inline}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => openEditDialog(template)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size={tokens.button.inline} className="h-8 w-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => openEditDialog(template)}>
                      <Pencil className="w-3.5 h-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPreviewTemplate(template)}>
                      <Eye className="w-3.5 h-3.5 mr-2" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openTestEmailDialog(template)}>
                      <Send className="w-3.5 h-3.5 mr-2" />
                      Send Test
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDuplicate(template)}
                      disabled={isDuplicating === template.id}
                    >
                      {isDuplicating === template.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 mr-2" />
                      )}
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the "{template.name}" email
                            template. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(template.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingTemplate}
        onOpenChange={(open) => {
          if (!open && hasUnsavedChanges) {
            setShowDiscardConfirm(true);
            return;
          }
          if (!open) setEditingTemplate(null);
        }}
      >
        <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col overflow-hidden p-0 [&>button]:hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                Edit Email Template
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
                    Unsaved Changes
                  </Badge>
                )}
              </DialogTitle>
              <div className="flex items-center gap-3">
                <Label className="text-sm">Active</Label>
                <Switch
                  checked={editForm.is_active}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, is_active: checked })
                  }
                />
                <button 
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      setShowDiscardConfirm(true);
                    } else {
                      setEditingTemplate(null);
                    }
                  }}
                  className="rounded-full p-1.5 opacity-70 hover:opacity-100 hover:bg-muted transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </div>
            <DialogDescription>
              Use the visual editor to design your email template, or switch to HTML code for full control.
            </DialogDescription>
          </DialogHeader>

          {/* Discard Changes Confirmation Dialog */}
          <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  You have unsaved changes to this email template. Are you sure you want to close without saving?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="mt-0">Keep Editing</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    setEditingTemplate(null);
                    setHasUnsavedChanges(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Discard Changes
                </AlertDialogAction>
                <AlertDialogAction 
                  onClick={async () => {
                    setShowDiscardConfirm(false);
                    await handleSave();
                    setEditingTemplate(null);
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Save & Close
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex-1 overflow-y-auto space-y-4 px-6">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Template Description</Label>
              <Input
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Brief description of when this email is sent..."
              />
            </div>

            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                className="font-mono"
              />
            </div>

            {/* Advanced Visual Editor - key forces remount when template changes */}
            <EmailTemplateEditor
              ref={editorRef}
              key={editingTemplate?.id}
              initialHtml={editForm.html_body}
              initialBlocks={editForm.blocks_json as any}
              variables={editingTemplate?.variables || []}
              onHtmlChange={(html) => setEditForm(prev => ({ ...prev, html_body: html }))}
              onBlocksChange={(blocks) => setEditForm(prev => ({ ...prev, blocks_json: blocks as unknown as Json }))}
            />
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 px-6 py-4 bg-background border-t mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {hasUnsavedChanges && 'Remember to save your changes'}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size={tokens.button.card}
                className="text-muted-foreground"
                onClick={() => {
                  editorRef.current?.regenerateHtml();
                  toast.success('HTML regenerated from blocks');
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button 
                variant="outline" 
                className="bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 hover:border-sky-300"
                onClick={() => {
                  // First regenerate HTML to ensure it's up to date
                  editorRef.current?.regenerateHtml();
                  if (editingTemplate) {
                    // Use current editForm state (with latest html_body from editor) instead of saved template
                    // Use setTimeout to allow state to update after regenerate
                    setTimeout(() => {
                      setPreviewTemplate({
                        ...editingTemplate,
                        html_body: editForm.html_body,
                        subject: editForm.subject,
                        variables: editingTemplate.variables,
                      });
                    }, 50);
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingTemplate(null);
                  setHasUnsavedChanges(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={updateTemplate.isPending || !hasUnsavedChanges}
                className={cn(hasUnsavedChanges && 'animate-pulse')}
              >
                {updateTemplate.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog - Email Client Style (iOS Mail inspired) */}
      <Dialog
        open={!!previewTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTemplate(null);
          }
        }}
      >
        <DialogContent 
          className={cn(
            "max-h-[95vh] overflow-hidden p-0 gap-0 transition-all duration-500 ease-out",
            previewMode === 'desktop' ? 'max-w-4xl' : 'max-w-md'
          )}
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
        >
          {/* Viewer Mode Bar - Top */}
          <div className="flex items-center justify-center gap-4 px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Now viewing in</span>
              </div>
              <div className="relative flex items-center rounded-full p-1 bg-background border border-border shadow-sm">
                {/* Sliding indicator */}
                <div 
                  className={cn(
                    "absolute top-1 bottom-1 w-[100px] rounded-full bg-foreground transition-all duration-300 ease-out",
                    previewMode === 'desktop' ? "left-1" : "left-[104px]"
                  )}
                />
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={cn(
                    "relative z-10 flex items-center justify-center gap-2 w-[100px] py-1.5 rounded-full text-sm font-sans font-medium transition-colors duration-200",
                    previewMode === 'desktop' 
                      ? "text-background" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Monitor className="w-4 h-4" />
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={cn(
                    "relative z-10 flex items-center justify-center gap-2 w-[100px] py-1.5 rounded-full text-sm font-sans font-medium transition-colors duration-200",
                    previewMode === 'mobile' 
                      ? "text-background" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Smartphone className="w-4 h-4" />
                  Mobile
                </button>
              </div>
              <span className="text-sm font-medium text-foreground">mode</span>
            </div>
          </div>

          {/* Email Client Header - iOS style */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ backgroundColor: '#f6f6f6' }}>
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#e8e8e8' }}
              >
                <Mail className="w-5 h-5" style={{ color: '#8e8e93' }} />
              </div>
              <div>
                <div className="font-medium text-[15px] tracking-[-0.01em]" style={{ color: '#000000' }}>Your Salon</div>
                <div className="text-[13px]" style={{ color: '#8e8e93' }}>noreply@salon.com</div>
              </div>
            </div>
            
            <div className="text-[13px] hidden sm:block" style={{ color: '#8e8e93' }}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
          </div>
          
          {/* Email Subject & Recipients - iOS Mail style */}
          <div className="px-5 py-4 border-b bg-white">
            <h2 
              className={cn(
                "font-medium tracking-[-0.02em] leading-tight mb-3",
                previewMode === 'desktop' ? 'text-[22px]' : 'text-[20px]'
              )}
              style={{ 
                color: '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                fontWeight: 700,
                textTransform: 'none',
                letterSpacing: '-0.02em'
              }}
            >
              {previewTemplate?.subject ? renderPreviewHtml(previewTemplate.subject, previewTemplate?.variables || []).replace(/<[^>]*>/g, '') : 'No Subject'}
            </h2>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[15px]">
                <span className="font-medium w-12" style={{ color: '#8e8e93' }}>From:</span>
                <span style={{ color: '#000000' }}>Your Salon</span>
                <span style={{ color: '#8e8e93' }}>&lt;noreply@salon.com&gt;</span>
              </div>
              <div className="flex items-center gap-2 text-[15px]">
                <span className="font-medium w-12" style={{ color: '#8e8e93' }}>To:</span>
                <span style={{ color: '#007aff' }}>team@salon.com</span>
              </div>
            </div>
          </div>
          
          {/* Email Body */}
          <div className="overflow-y-auto max-h-[calc(95vh-200px)] transition-all duration-500" style={{ backgroundColor: '#f2f2f7' }}>
            <div className={cn(
              "transition-all duration-500 ease-out",
              previewMode === 'desktop' ? 'p-6 pb-40' : 'p-3 pb-32'
            )}>
              {/* Outer email wrapper to simulate email client viewport */}
              <div 
                className={cn(
                  "mx-auto bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-500 ease-out origin-top",
                  previewMode === 'mobile' && 'animate-scale-in'
                )}
                style={{ 
                  maxWidth: previewMode === 'desktop' ? '600px' : '100%',
                  transform: `scale(${previewMode === 'desktop' ? 1 : 1})`,
                }}
              >
                {previewTemplate && (
                  <div
                    className="transition-opacity duration-300"
                    dangerouslySetInnerHTML={{
                      __html: renderPreviewHtml(
                        previewTemplate.html_body,
                        previewTemplate.variables
                      ),
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Send Test Email Dialog */}
      <Dialog
        open={!!testEmailTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setTestEmailTemplate(null);
            setTestEmailAddress('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email for "{testEmailTemplate?.name}" with sample data to preview how it will look in your inbox.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Recipient Email</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="Enter email address..."
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">
                <strong>Note:</strong> The test email will include a banner indicating it's a test, and all template variables will be replaced with sample data.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTestEmailTemplate(null);
                setTestEmailAddress('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendTestEmail}
              disabled={isSendingTest || !testEmailAddress}
            >
              {isSendingTest ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create New Template Dialog */}
      <Dialog
        open={isCreating}
        onOpenChange={(open) => !open && setIsCreating(false)}
      >
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Email Template</DialogTitle>
            <DialogDescription>
              Design a new email template from scratch using the visual editor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Key *</Label>
                <Input
                  value={createForm.template_key}
                  onChange={(e) => setCreateForm({ ...createForm, template_key: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '') })}
                  placeholder="e.g., welcome_email, password_reset"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier used in code to reference this template
                </p>
              </div>
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g., Welcome Email, Password Reset"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject Line *</Label>
              <Input
                value={createForm.subject}
                onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                placeholder="e.g., Welcome to Our Salon!"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Brief description of when this email is sent..."
              />
            </div>

            <div className="space-y-2">
              <Label>Template Variables</Label>
              <div className="flex gap-2">
                <Input
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  placeholder="Add a variable (e.g., user_name)"
                  className="font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addVariable();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addVariable}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {createForm.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {createForm.variables.map((variable) => (
                    <Badge
                      key={variable}
                      variant="secondary"
                      className="text-xs font-mono cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      onClick={() => removeVariable(variable)}
                      title="Click to remove"
                    >
                      {`{{${variable}}}`} ×
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Variables can be inserted into the email content. Click a variable to remove it.
              </p>
            </div>

            {/* Visual Editor */}
            <EmailTemplateEditor
              initialHtml={createForm.html_body}
              variables={createForm.variables}
              onHtmlChange={(html) => setCreateForm({ ...createForm, html_body: html })}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={createTemplate.isPending || !createForm.template_key || !createForm.name || !createForm.subject}
            >
              {createTemplate.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
