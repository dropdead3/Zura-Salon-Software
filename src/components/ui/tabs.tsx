import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";
import { TABS_CLASSES } from "./tabs.tokens";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-11 items-center justify-center p-1.5 text-muted-foreground gap-1 bg-muted/70",
      className,
    )}
    style={{ borderRadius: 9 }}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap px-3.5 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-black/[0.07] dark:data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-black/[0.10] dark:data-[state=active]:ring-white/[0.12] data-[state=active]:backdrop-blur-sm data-[state=inactive]:hover:ring-1 data-[state=inactive]:hover:ring-black/[0.06] dark:data-[state=inactive]:hover:ring-white/[0.08] data-[state=inactive]:hover:text-foreground/80",
      className,
    )}
    style={{ borderRadius: 6 }}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      TABS_CLASSES.content,
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// Sub-tab variants for nested navigation (underline style)
const SubTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      TABS_CLASSES.subList,
      className,
    )}
    {...props}
  />
));
SubTabsList.displayName = "SubTabsList";

const SubTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      TABS_CLASSES.subTrigger,
      className,
    )}
    {...props}
  />
));
SubTabsTrigger.displayName = "SubTabsTrigger";

// Compact filter variants for analytics card inline toggles
const FilterTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(TABS_CLASSES.filterList, className)}
    {...props}
  />
));
FilterTabsList.displayName = "FilterTabsList";

const FilterTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(TABS_CLASSES.filterTrigger, className)}
    {...props}
  />
));
FilterTabsTrigger.displayName = "FilterTabsTrigger";

export { Tabs, TabsList, TabsTrigger, TabsContent, SubTabsList, SubTabsTrigger, FilterTabsList, FilterTabsTrigger };
export { ResponsiveTabsList } from '@/components/ui/responsive-tabs-list';
