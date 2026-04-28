import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Render above all overlays/drawers (PremiumFloatingPanel uses z-50,
      // radix dialogs/sheets up to z-[100]). Toasts must always win.
      style={{ zIndex: 2147483000 } as React.CSSProperties}
      icons={{
        success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        error: <XCircle className="h-4 w-4 text-destructive" />,
        info: <Info className="h-4 w-4 text-primary" />,
        warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            [
              // glass
              "group toast",
              "group-[.toaster]:bg-card/80 group-[.toaster]:backdrop-blur-xl",
              "group-[.toaster]:text-foreground group-[.toaster]:border-border/40",
              "group-[.toaster]:shadow-[0_16px_40px_-18px_hsl(var(--foreground)/0.25)]",
              "group-[.toaster]:rounded-lg",
              // typography
              "font-sans",
              // motion polish (sonner uses data-state)
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-2",
            ].join(" "),
          description: "group-[.toast]:text-muted-foreground text-xs leading-snug",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md",
          cancelButton:
            "group-[.toast]:bg-muted/60 group-[.toast]:text-muted-foreground group-[.toast]:rounded-md",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
