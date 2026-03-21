import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Calculator, Info, RotateCcw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tokens } from '@/lib/design-tokens';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CapacityBreakdownProps {
  grossHoursPerStylist: number;
  breakMinutes: number;
  lunchMinutes: number;
  paddingMinutes: number;
  stylistCount: number;
  daysInPeriod: number;
  className?: string;
}

export function CapacityBreakdown({
  grossHoursPerStylist: initialGrossHours,
  breakMinutes: initialBreakMinutes,
  lunchMinutes: initialLunchMinutes,
  paddingMinutes: initialPaddingMinutes,
  stylistCount: initialStylistCount,
  daysInPeriod,
  className,
}: CapacityBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Editable state with sensible defaults
  const [breakMinutes, setBreakMinutes] = useState(20);
  const [lunchMinutes, setLunchMinutes] = useState(30);
  const [paddingMinutes, setPaddingMinutes] = useState(15);
  const [stylingMinutes, setStylingMinutes] = useState(20);
  const [stylingPercentage, setStylingPercentage] = useState(25);

  // Calculations (use props directly for hours/stylists)
  const breakHoursPerDay = (breakMinutes / 60) * initialStylistCount;
  const lunchHoursPerDay = (lunchMinutes / 60) * initialStylistCount;
  const grossHoursPerDay = initialGrossHours * initialStylistCount;
  const netHoursPerDay = Math.max(0, grossHoursPerDay - breakHoursPerDay - lunchHoursPerDay);
  
  const totalNetHours = netHoursPerDay * daysInPeriod;

  // Calculate padding impact (as percentage of booking time)
  const avgAppointmentMinutes = 60;
  const paddingImpact = paddingMinutes > 0 
    ? Math.round((paddingMinutes / (avgAppointmentMinutes + paddingMinutes)) * 100)
    : 0;

  // Calculate styling/photography impact (weighted by percentage of appointments)
  const stylingImpact = stylingMinutes > 0 && stylingPercentage > 0
    ? Math.round(((stylingMinutes * (stylingPercentage / 100)) / avgAppointmentMinutes) * 100)
    : 0;

  const hasChanges = 
    breakMinutes !== 20 ||
    lunchMinutes !== 30 ||
    paddingMinutes !== 15 ||
    stylingMinutes !== 20 ||
    stylingPercentage !== 25;

  const handleReset = () => {
    setBreakMinutes(20);
    setLunchMinutes(30);
    setPaddingMinutes(15);
    setStylingMinutes(20);
    setStylingPercentage(25);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn('', className)}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size={tokens.button.inline}
          className="w-full flex items-center justify-between h-9 px-3 border border-border rounded-lg hover:bg-muted/50 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calculator className="w-3.5 h-3.5" />
            <span>How is capacity calculated?</span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="bg-muted/30 rounded-xl p-4 space-y-4 text-sm">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div className="font-medium text-foreground">Daily Capacity Calculator</div>
            {hasChanges && (
              <Button
                variant="ghost"
                size={tokens.button.inline}
                onClick={handleReset}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </Button>
            )}
          </div>
          
          {/* Calculator Rows */}
          <div className="space-y-3">
            {/* Operating Hours × Stylists - Read Only */}
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr,auto] items-center gap-4">
                <span className="text-muted-foreground">Operating Hours × Stylists</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-sm">{initialGrossHours}h</span>
                  <span className="text-muted-foreground text-xs">×</span>
                  <span className="tabular-nums text-sm">{initialStylistCount}</span>
                  <span className="text-muted-foreground text-xs">=</span>
                  <span className="font-medium tabular-nums w-14 text-right">{grossHoursPerDay}h</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground/70">
                  From your location settings
                </span>
                <Link 
                  to="/dashboard/admin/settings?category=locations"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Edit Settings
                  <Settings className="w-3 h-3" />
                </Link>
              </div>
            </div>
            
            {/* Break deduction */}
            <div className="grid grid-cols-[1fr,auto] items-center gap-4">
              <span className="text-muted-foreground">Less Breaks (per stylist)</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Math.max(0, Math.min(120, Number(e.target.value) || 0)))}
                  className="w-20 h-8 text-sm text-center tabular-nums bg-background pr-1"
                />
                <span className="text-muted-foreground text-xs w-6">min</span>
                <span className="w-16" />
                <span className="w-4" />
                <span className="tabular-nums w-14 text-right text-muted-foreground">
                  −{breakHoursPerDay.toFixed(1)}h
                </span>
              </div>
            </div>
            
            {/* Lunch deduction */}
            <div className="grid grid-cols-[1fr,auto] items-center gap-4">
              <span className="text-muted-foreground">Less Lunch (per stylist)</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={lunchMinutes}
                  onChange={(e) => setLunchMinutes(Math.max(0, Math.min(120, Number(e.target.value) || 0)))}
                  className="w-20 h-8 text-sm text-center tabular-nums bg-background pr-1"
                />
                <span className="text-muted-foreground text-xs w-6">min</span>
                <span className="w-16" />
                <span className="w-4" />
                <span className="tabular-nums w-14 text-right text-muted-foreground">
                  −{lunchHoursPerDay.toFixed(1)}h
                </span>
              </div>
            </div>
          </div>
          
          {/* Net hours result */}
          <div className="pt-3 border-t border-border/50">
            <div className="grid grid-cols-[1fr,auto] items-center gap-4">
              <span className="font-medium text-foreground">Net Available Hours</span>
              <span className="text-primary font-medium tabular-nums text-base">
                {netHoursPerDay.toFixed(1)}h<span className="text-xs font-normal text-muted-foreground">/day</span>
              </span>
            </div>

            {/* Period total */}
            {daysInPeriod > 1 && (
              <div className="grid grid-cols-[1fr,auto] items-center gap-4 mt-2">
                <span className="text-muted-foreground text-xs">Total for {daysInPeriod} days</span>
                <span className="tabular-nums font-medium text-sm">{Math.round(totalNetHours)}h</span>
              </div>
            )}
          </div>

          {/* Padding section */}
          <div className="pt-3 border-t border-border/50 space-y-3">
            <div className="grid grid-cols-[1fr,auto] items-center gap-4">
              <span className="text-muted-foreground">Appointment Padding</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={paddingMinutes}
                  onChange={(e) => setPaddingMinutes(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                  className="w-20 h-8 text-sm text-center tabular-nums bg-background pr-1"
                />
                <span className="text-muted-foreground text-xs">min</span>
              </div>
            </div>
            {paddingMinutes > 0 && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/70" />
                <span>
                  Adding {paddingMinutes} min between appointments reduces effective booking capacity by ~{paddingImpact}% for 1-hour services.
                </span>
              </div>
            )}
          </div>

          {/* Styling & Photography section */}
          <div className="pt-3 border-t border-border/50 space-y-3">
            <div className="grid grid-cols-[1fr,auto] items-center gap-4">
              <span className="text-muted-foreground">Styling & Photography</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={stylingMinutes}
                    onChange={(e) => setStylingMinutes(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                    className="w-20 h-8 text-sm text-center tabular-nums bg-background pr-1"
                  />
                  <span className="text-muted-foreground text-xs">min</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={stylingPercentage}
                    onChange={(e) => setStylingPercentage(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="w-20 h-8 text-sm text-center tabular-nums bg-background pr-1"
                  />
                  <span className="text-muted-foreground text-xs">%</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="text-xs">Percentage of appointments that get styled and photographed</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
            {stylingMinutes > 0 && stylingPercentage > 0 && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/70" />
                <span>
                  If {stylingPercentage}% of appointments include {stylingMinutes} min of styling/photography,
                  this reduces effective capacity by ~{stylingImpact}%.
                </span>
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
