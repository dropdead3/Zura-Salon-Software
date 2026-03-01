import { useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';
import { useSubmitFeatureRequest, FEATURE_CATEGORIES } from '@/hooks/useFeatureRequests';
import { toast } from 'sonner';
import { PLATFORM_NAME } from '@/lib/brand';
import { PremiumFloatingPanel } from '@/components/ui/premium-floating-panel';

interface MobileSubmitDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSubmitDrawer({ open, onOpenChange }: MobileSubmitDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  
  const submitRequest = useSubmitFeatureRequest();

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await submitRequest.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category,
      });
      
      toast.success('Feature request submitted!');
      setTitle('');
      setDescription('');
      setCategory('general');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to submit request');
    }
  };

  const isValid = title.trim() && description.trim();

  return (
    <PremiumFloatingPanel 
      open={open} 
      onOpenChange={onOpenChange} 
      side="bottom"
      maxHeight="90vh"
      maxWidth="100%"
      showCloseButton
    >
      <div className="p-5 pb-4 border-b border-border/40">
        <h2 className="font-display text-sm tracking-wide uppercase">Submit a Feature Request</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Have an idea to improve {PLATFORM_NAME}? Share it with us!
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mobile-title">Title *</Label>
          <Input
            id="mobile-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Client Photo Gallery"
            className="text-base" // Prevents zoom on iOS
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="mobile-category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="mobile-category">
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
          <Label htmlFor="mobile-description">Description *</Label>
          <Textarea
            id="mobile-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your idea and how it would help..."
            rows={4}
            className="text-base resize-none" // Prevents zoom on iOS
          />
        </div>
      </div>
      
      <div className="p-5 pt-0 space-y-3">
        <Button 
          onClick={handleSubmit} 
          disabled={!isValid || submitRequest.isPending}
          className="w-full"
          size="lg"
        >
          {submitRequest.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Request
            </>
          )}
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
      </div>
    </PremiumFloatingPanel>
  );
}
