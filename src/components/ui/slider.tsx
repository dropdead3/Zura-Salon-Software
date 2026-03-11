import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const sliderVariants = cva(
  "relative flex w-full touch-none select-none items-center py-1",
  {
    variants: {
      variant: {
        default: "",
        filled: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    VariantProps<typeof sliderVariants> {}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, variant, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(sliderVariants({ variant }), className)}
    {...props}
  >
    <SliderPrimitive.Track 
      className={cn(
        "relative h-2.5 w-full grow overflow-hidden rounded-full mx-[7px]",
        variant === "filled" ? "bg-muted" : "bg-secondary"
      )}
    >
      <SliderPrimitive.Range 
        className={cn(
          "absolute h-full rounded-full",
          variant === "filled" ? "bg-primary" : "bg-primary/80"
        )} 
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb 
      className={cn(
        "block h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing hover:scale-125 active:scale-110",
        variant === "filled" 
          ? "border-white bg-primary shadow-md hover:shadow-lg" 
          : "border-primary bg-background shadow-sm hover:shadow-md"
      )} 
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
