import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus, 
  FileText, 
  Check, 
  Eye,
  Pencil,
  Trash2 
} from 'lucide-react';
import { 
  useDayRateAgreements, 
  useCreateDayRateAgreement, 
  useSetActiveAgreement,
  useDeleteDayRateAgreement 
} from '@/hooks/useDayRateAgreement';
import type { DayRateAgreement } from '@/hooks/useDayRateAgreement';
import { useFormatDate } from '@/hooks/useFormatDate';

export function AgreementEditor() {
  const { formatDate } = useFormatDate();
  const { data: agreements, isLoading } = useDayRateAgreements();
  const createAgreement = useCreateDayRateAgreement();
  const setActive = useSetActiveAgreement();
  const deleteAgreement = useDeleteDayRateAgreement();

  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState<DayRateAgreement | null>(null);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg tracking-wide mb-1">RENTAL AGREEMENT</h3>
          <p className="text-sm text-muted-foreground">
            Manage the agreement that guests must sign before booking
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Version
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Create New Agreement Version</DialogTitle>
            </DialogHeader>
            <CreateAgreementForm 
              onSuccess={() => setShowCreate(false)}
              existingVersions={agreements?.map(a => a.version) || []}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Agreement List */}
      <div className="space-y-3">
        {agreements && agreements.length > 0 ? (
          agreements.map(agreement => (
            <Card key={agreement.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{agreement.title}</h4>
                      <Badge variant="outline">{agreement.version}</Badge>
                      {agreement.is_active && (
                        <Badge variant="default" className="bg-primary">
                          <Check className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created {formatDate(new Date(agreement.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPreview(agreement)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {!agreement.is_active && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActive.mutate(agreement.id)}
                      >
                        Set Active
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Agreement?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete version {agreement.version}. 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteAgreement.mutate(agreement.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-medium mb-2">No Agreements</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first rental agreement to get started
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Agreement
            </Button>
          </Card>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {showPreview?.title}
              <Badge variant="outline">{showPreview?.version}</Badge>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="prose prose-sm max-w-none">
              {showPreview && formatMarkdown(showPreview.content)}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateAgreementForm({ 
  onSuccess, 
  existingVersions 
}: { 
  onSuccess: () => void;
  existingVersions: string[];
}) {
  const createAgreement = useCreateDayRateAgreement();
  
  // Suggest next version
  const suggestVersion = () => {
    if (existingVersions.length === 0) return 'v1.0';
    const versions = existingVersions
      .map(v => parseFloat(v.replace('v', '')))
      .filter(v => !isNaN(v));
    const max = Math.max(...versions);
    return `v${(max + 0.1).toFixed(1)}`;
  };

  const [formData, setFormData] = useState({
    version: suggestVersion(),
    title: 'Day Rate Chair Rental Agreement',
    content: `# Day Rate Chair Rental Agreement

## Terms and Conditions

By booking a day rate chair rental, you agree to the following terms:

### 1. License Requirements
- You must hold a valid cosmetology license in your state
- You must provide your license number at the time of booking
- Your license must be current and in good standing

### 2. Booking Terms
- Your booking is for a single day (operating hours only)
- You must arrive within 30 minutes of the location opening time
- Late arrivals may result in forfeiture of your booking

### 3. Equipment & Supplies
- Basic station equipment is provided (chair, mirror, electrical outlets)
- You must bring your own tools, products, and supplies
- The salon is not responsible for lost or stolen items

### 4. Conduct
- You agree to maintain a professional environment
- You must follow all salon policies and procedures
- Disruptive behavior may result in immediate termination of your booking

### 5. Cancellation Policy
- Cancellations made 48+ hours in advance: Full refund
- Cancellations made 24-48 hours in advance: 50% refund
- Cancellations made less than 24 hours: No refund

### 6. Liability
- You are responsible for your own clients and services
- You must carry your own liability insurance
- The salon is not liable for any claims arising from your services

### 7. Payment
- Full payment is required at the time of booking
- No refunds for unused time or early departure

By proceeding with this booking, you acknowledge that you have read, understood, and agree to these terms and conditions.`,
    is_active: existingVersions.length === 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAgreement.mutateAsync(formData);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            value={formData.version}
            onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
            placeholder="v1.0"
          />
        </div>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="content">Agreement Content (Markdown)</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          className="min-h-[300px] font-mono text-sm"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={createAgreement.isPending}>
          {createAgreement.isPending ? 'Creating...' : 'Create Agreement'}
        </Button>
      </div>
    </form>
  );
}

// Simple markdown formatter
function formatMarkdown(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  lines.forEach((line, index) => {
    if (line.startsWith('### ')) {
      elements.push(<h3 key={index} className="text-base font-medium mt-4 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={index} className="text-lg font-medium mt-6 mb-3">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={index} className="text-xl font-medium mt-6 mb-4">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ')) {
      elements.push(<li key={index} className="ml-4 mb-1">{line.slice(2)}</li>);
    } else if (line.trim()) {
      elements.push(<p key={index} className="mb-2">{line}</p>);
    }
  });

  return elements;
}
