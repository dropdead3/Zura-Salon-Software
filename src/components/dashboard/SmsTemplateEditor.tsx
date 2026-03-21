import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Variable, Save, X, Eye, EyeOff } from 'lucide-react';
import { useEmailVariables } from '@/hooks/useEmailVariables';
import type { SmsTemplate } from '@/hooks/useSmsTemplates';
import { cn } from '@/lib/utils';

interface SmsTemplateEditorProps {
  template: SmsTemplate | null;
  onSave: (updates: Partial<SmsTemplate>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Check if message contains unicode characters (emojis, special chars)
function hasUnicode(text: string): boolean {
  return /[^\u0000-\u007F]/.test(text);
}

// Calculate SMS segments
function calculateSegments(text: string): { chars: number; segments: number; limit: number; isUnicode: boolean } {
  const isUnicode = hasUnicode(text);
  const limit = isUnicode ? 70 : 160;
  const chars = text.length;
  const segments = chars === 0 ? 0 : Math.ceil(chars / limit);
  return { chars, segments, limit, isUnicode };
}

// Get color class based on segment count
function getSegmentColor(segments: number): string {
  if (segments <= 1) return 'text-green-600';
  if (segments <= 2) return 'text-yellow-600';
  if (segments <= 3) return 'text-orange-600';
  return 'text-red-600';
}

export function SmsTemplateEditor({ template, onSave, onCancel, isLoading }: SmsTemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [messageBody, setMessageBody] = useState(template?.message_body || '');
  const [description, setDescription] = useState(template?.description || '');
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { data: variables = [] } = useEmailVariables();
  
  // Group variables by category
  const groupedVariables = variables.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, typeof variables>);

  // Filter to SMS-relevant categories
  const smsCategories = ['client', 'appointment', 'business', 'location'];
  const filteredCategories = Object.entries(groupedVariables).filter(
    ([cat]) => smsCategories.includes(cat.toLowerCase())
  );

  const segmentInfo = calculateSegments(messageBody);

  const insertVariable = (variableKey: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = messageBody;
    const insertion = `{{${variableKey}}}`;
    
    setMessageBody(text.substring(0, start) + insertion + text.substring(end));
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      const newPos = start + insertion.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleSave = () => {
    if (!name.trim() || !messageBody.trim()) return;
    
    // Extract variables from message body
    const usedVariables = [...messageBody.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
    
    onSave({
      name: name.trim(),
      message_body: messageBody.trim(),
      description: description.trim() || null,
      is_active: isActive,
      variables: usedVariables,
    });
  };

  // Preview with sample data
  const getPreviewText = () => {
    let preview = messageBody;
    const sampleData: Record<string, string> = {
      first_name: 'Sarah',
      last_name: 'Johnson',
      location_name: 'Downtown Studio',
      appointment_date: 'January 28, 2026',
      appointment_time: '2:30 PM',
      stylist_name: 'Emily',
      business_name: 'Your Salon',
    };
    
    return preview.replace(/\{\{(\w+)\}\}/g, (_, key) => sampleData[key] || `[${key}]`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg">
          {template ? 'EDIT TEMPLATE' : 'NEW TEMPLATE'}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
        </div>
      </div>

      {/* Template Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Template Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Appointment Reminder"
          disabled={isLoading}
        />
      </div>

      {/* Message Body */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="message">Message</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size={tokens.button.inline} disabled={isLoading}>
                <Variable className="h-4 w-4 mr-1" />
                Insert Variable
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
              {filteredCategories.map(([category, vars]) => (
                <div key={category}>
                  <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
                    {category}
                  </DropdownMenuLabel>
                  {vars.filter(v => v.is_active).map((v) => (
                    <DropdownMenuItem
                      key={v.id}
                      onClick={() => insertVariable(v.variable_key)}
                    >
                      <span className="font-mono text-sm">{`{{${v.variable_key}}}`}</span>
                      <span className="ml-2 text-xs text-muted-foreground truncate">
                        {v.description}
                      </span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {showPreview ? (
          <div className="rounded-lg border bg-muted/30 p-4 min-h-[120px]">
            <p className="text-sm whitespace-pre-wrap">{getPreviewText()}</p>
          </div>
        ) : (
          <Textarea
            ref={textareaRef}
            id="message"
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Hi {{first_name}}, your appointment is confirmed for {{appointment_date}}..."
            className="min-h-[120px] font-mono text-sm"
            disabled={isLoading}
          />
        )}

        {/* Character Counter */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className={cn('font-medium', getSegmentColor(segmentInfo.segments))}>
              {segmentInfo.chars} / {segmentInfo.limit} characters
            </span>
            <span className="text-muted-foreground">
              ({segmentInfo.segments} {segmentInfo.segments === 1 ? 'segment' : 'segments'})
            </span>
            {segmentInfo.isUnicode && (
              <Badge variant="secondary" className="text-xs">
                Unicode
              </Badge>
            )}
          </div>
          {segmentInfo.segments > 3 && (
            <span className="text-red-600 text-xs">
              Long messages may incur higher costs
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="When is this template used?"
          disabled={isLoading}
        />
      </div>

      {/* Active Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label htmlFor="active" className="font-medium">Active</Label>
          <p className="text-sm text-muted-foreground">
            Enable this template for automated messages
          </p>
        </div>
        <Switch
          id="active"
          checked={isActive}
          onCheckedChange={setIsActive}
          disabled={isLoading}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || !messageBody.trim() || isLoading}
        >
          <Save className="h-4 w-4 mr-1" />
          Save Template
        </Button>
      </div>
    </div>
  );
}
