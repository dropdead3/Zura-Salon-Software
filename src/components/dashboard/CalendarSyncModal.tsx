import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Card } from '@/components/ui/card';
import { 
  Calendar, 
  Download, 
  ExternalLink, 
  Smartphone,
  Monitor,
  CheckCircle2
} from 'lucide-react';
import { downloadCalendar, getGoogleCalendarUrl } from '@/utils/programCalendarExport';
import { toast } from 'sonner';

interface CalendarSyncModalProps {
  startDate: Date;
  programName?: string;
}

export function CalendarSyncModal({ startDate, programName = 'Client Engine' }: CalendarSyncModalProps) {
  const [open, setOpen] = useState(false);

  const handleDownloadICS = () => {
    downloadCalendar(startDate, programName);
    toast.success('Calendar file downloaded!');
  };

  const handleGoogleCalendar = () => {
    const url = getGoogleCalendarUrl(
      `${programName} - Day 1`,
      startDate,
      new Date(startDate.getTime() + 30 * 60000),
      'Start of your 75-day Client Engine journey!'
    );
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={tokens.button.card}>
          <Calendar className="w-4 h-4 mr-2" />
          Sync to Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Add to Your Calendar
          </DialogTitle>
          <DialogDescription>
            Get daily reminders to stay on track with your 75-day journey
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Add Options */}
          <div className="grid gap-3">
            <Card 
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={handleDownloadICS}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Download Calendar File</p>
                  <p className="text-sm text-muted-foreground">
                    .ics file - Works with Apple Calendar, Outlook, etc.
                  </p>
                </div>
              </div>
            </Card>

            <Card 
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={handleGoogleCalendar}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Add to Google Calendar</p>
                  <p className="text-sm text-muted-foreground">
                    Opens Google Calendar with pre-filled event
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-sm">Setup Instructions</h4>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Monitor className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Desktop (Mac/PC)</p>
                  <ol className="text-xs text-muted-foreground space-y-1 mt-1">
                    <li>1. Download the .ics file</li>
                    <li>2. Double-click to open with your calendar app</li>
                    <li>3. Confirm import when prompted</li>
                  </ol>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Smartphone className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">iPhone/iPad</p>
                  <ol className="text-xs text-muted-foreground space-y-1 mt-1">
                    <li>1. Download the .ics file</li>
                    <li>2. Tap the downloaded file</li>
                    <li>3. Select "Add All" to import events</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">What's Included</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success-foreground" />
                Daily task reminders
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success-foreground" />
                Weekly wins prompts
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success-foreground" />
                30-min reminder alerts
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success-foreground" />
                Graduation celebration
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
