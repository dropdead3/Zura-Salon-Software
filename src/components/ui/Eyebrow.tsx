import { cn } from "@/lib/utils";

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Eyebrow({ children, className, style }: EyebrowProps) {
  return (
    <span
      // `.section-eyebrow` is the opt-in hook for the section-level Eb (eyebrow)
      // chip. SectionStyleWrapper sets `data-eyebrow="off"` on the section wrapper
      // when an operator hides the eyebrow; the global rule in index.css then
      // hides any descendant `.section-eyebrow` automatically — every section
      // that renders <Eyebrow /> picks up the toggle for free.
      className={cn(
        "section-eyebrow text-xs uppercase tracking-[0.2em] block font-display font-medium",
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}
