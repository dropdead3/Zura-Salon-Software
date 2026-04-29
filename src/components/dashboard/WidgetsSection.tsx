import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings2, Cake, Calendar, Award, Sparkles, Armchair, HelpCircle, Brain } from 'lucide-react';
import { BirthdayWidget } from './BirthdayWidget';
import { WorkScheduleWidgetCompact } from './WorkScheduleWidgetCompact';
import { AnniversaryWidget } from './AnniversaryWidget';
import { ChangelogWidget } from './ChangelogWidget';
import { DayRateWidget } from './DayRateWidget';
import { HelpCenterWidget } from './HelpCenterWidget';
import { AITasksWidget } from './AITasksWidget';
import { VisibilityGate } from '@/components/visibility/VisibilityGate';
import { useDashboardLayout, useSaveDashboardLayout } from '@/hooks/useDashboardLayout';
import { BentoGrid } from '@/components/ui/bento-grid';
import type { ReactNode } from 'react';

// Widget configuration - add more widgets here as needed
const AVAILABLE_WIDGETS = [
  { id: 'changelog', label: "What's New", icon: Sparkles },
  { id: 'birthdays', label: 'Team Birthdays', icon: Cake },
  { id: 'anniversaries', label: 'Work Anniversaries', icon: Award },
  { id: 'schedule', label: 'My Work Days', icon: Calendar },
  { id: 'dayrate', label: 'Day Rate Bookings', icon: Armchair },
  { id: 'help', label: 'Help Center', icon: HelpCircle },
  { id: 'ai_tasks', label: 'AI Tasks', icon: Brain },
] as const;

type WidgetId = typeof AVAILABLE_WIDGETS[number]['id'];

interface WidgetsSectionProps {
  // Allow parent to control enabled widgets if needed
  defaultEnabledWidgets?: WidgetId[];
}

export function WidgetsSection({ defaultEnabledWidgets = ['changelog', 'birthdays', 'anniversaries', 'schedule', 'ai_tasks'] }: WidgetsSectionProps) {
  const { layout } = useDashboardLayout();
  const saveLayout = useSaveDashboardLayout();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Use layout widgets if available, otherwise fall back to defaults
  const enabledWidgets = (layout?.widgets?.length > 0 ? layout.widgets : defaultEnabledWidgets) as WidgetId[];

  const toggleWidget = (widgetId: WidgetId) => {
    const newWidgets = enabledWidgets.includes(widgetId)
      ? enabledWidgets.filter(id => id !== widgetId)
      : [...enabledWidgets, widgetId];
    
    // Persist to database
    saveLayout.mutate({ ...layout, widgets: newWidgets });
  };

  const isWidgetEnabled = (widgetId: WidgetId) => enabledWidgets.includes(widgetId);

  // Don't render if no widgets are enabled
  if (enabledWidgets.length === 0 && !isSettingsOpen) {
    return (
      <div className="flex items-center justify-end">
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size={tokens.button.card} className="gap-2 text-muted-foreground">
              <Settings2 className="w-4 h-4" />
              <span className="text-xs">Add Widgets</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display tracking-wide">WIDGET SETTINGS</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {AVAILABLE_WIDGETS.map((widget) => {
                const Icon = widget.icon;
                return (
                  <div key={widget.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{widget.label}</span>
                    </div>
                    <Switch
                      checked={isWidgetEnabled(widget.id)}
                      onCheckedChange={() => toggleWidget(widget.id)}
                    />
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm tracking-wide">WIDGETS</h2>
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Settings2 className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display tracking-wide">WIDGET SETTINGS</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {AVAILABLE_WIDGETS.map((widget) => {
                const Icon = widget.icon;
                return (
                  <div key={widget.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{widget.label}</span>
                    </div>
                    <Switch
                      checked={isWidgetEnabled(widget.id)}
                      onCheckedChange={() => toggleWidget(widget.id)}
                    />
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <VisibilityGate elementKey="widget_changelog" elementName="What's New Widget" elementCategory="Dashboard Widgets">
          {isWidgetEnabled('changelog') && <ChangelogWidget />}
        </VisibilityGate>
        <VisibilityGate elementKey="widget_birthdays" elementName="Team Birthdays Widget" elementCategory="Dashboard Widgets">
          {isWidgetEnabled('birthdays') && <BirthdayWidget />}
        </VisibilityGate>
        <VisibilityGate elementKey="widget_anniversaries" elementName="Work Anniversaries Widget" elementCategory="Dashboard Widgets">
          {isWidgetEnabled('anniversaries') && <AnniversaryWidget />}
        </VisibilityGate>
        <VisibilityGate elementKey="widget_schedule" elementName="My Work Days Widget" elementCategory="Dashboard Widgets">
          {isWidgetEnabled('schedule') && <WorkScheduleWidgetCompact />}
        </VisibilityGate>
        <VisibilityGate elementKey="widget_dayrate" elementName="Day Rate Bookings Widget" elementCategory="Dashboard Widgets">
          {isWidgetEnabled('dayrate') && <DayRateWidget />}
        </VisibilityGate>
        <VisibilityGate elementKey="widget_help" elementName="Help Center Widget" elementCategory="Dashboard Widgets">
          {isWidgetEnabled('help') && <HelpCenterWidget />}
        </VisibilityGate>
        <VisibilityGate elementKey="widget_ai_tasks" elementName="AI Tasks Widget" elementCategory="Dashboard Widgets">
          {isWidgetEnabled('ai_tasks') && <AITasksWidget />}
        </VisibilityGate>
      </div>
    </div>
  );
}
