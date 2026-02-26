import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TogglePillOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  tooltip?: string;
}

interface TogglePillProps {
  options: TogglePillOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "solid" | "glass";
  className?: string;
}

const sizeClasses = {
  sm: "text-xs px-3 py-1.5",
  default: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5",
};

const containerSizeClasses = {
  sm: "p-1 gap-0.5",
  default: "p-1 gap-1",
  lg: "p-1.5 gap-1",
};

const variantClasses = {
  default: "bg-muted/50 backdrop-blur-sm",
  solid: "bg-muted",
  glass: "bg-foreground/10 backdrop-blur-md",
};

export function TogglePill({
  options,
  value,
  onChange,
  size = "default",
  variant = "solid",
  className,
}: TogglePillProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({});

  // Calculate indicator position based on selected value
  React.useEffect(() => {
    if (!containerRef.current) return;
    
    const selectedIndex = options.findIndex(opt => opt.value === value);
    if (selectedIndex === -1) return;

    const buttons = containerRef.current.querySelectorAll('button');
    const selectedButton = buttons[selectedIndex];
    
    if (selectedButton) {
      setIndicatorStyle({
        width: selectedButton.offsetWidth,
        transform: `translateX(${selectedButton.offsetLeft - (size === 'sm' ? 4 : size === 'lg' ? 6 : 4)}px)`,
      });
    }
  }, [value, options, size]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={containerRef}
        className={cn(
          "inline-flex items-center rounded-full relative",
          containerSizeClasses[size],
          variantClasses[variant],
          className
        )}
      >
        {/* Sliding indicator */}
        <div
          className="absolute top-1 bottom-1 bg-foreground rounded-full transition-all duration-300 ease-out"
          style={indicatorStyle}
        />
        
        {options.map((option) => {
          const isSelected = option.value === value;
          
          const button = (
            <button
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 rounded-full font-sans font-medium transition-colors duration-200 outline-none focus:outline-none focus-visible:outline-none",
                sizeClasses[size],
                isSelected
                  ? "text-background"
                  : "text-foreground/60 hover:text-foreground/80"
              )}
            >
              <span className="flex items-center gap-1.5">
                {option.icon}
                {option.label}
              </span>
            </button>
          );

          if (option.tooltip) {
            return (
              <Tooltip key={option.value}>
                <TooltipTrigger asChild>
                  {button}
                </TooltipTrigger>
                <TooltipContent className="text-center">
                  {option.tooltip.split('\n').map((line, i) => (
                    <p key={i} className={i > 0 ? "text-muted-foreground text-xs mt-0.5" : "font-medium"}>{line}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <React.Fragment key={option.value}>{button}</React.Fragment>;
        })}
      </div>
    </TooltipProvider>
  );
}