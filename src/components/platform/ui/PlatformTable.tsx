import * as React from 'react';
import { cn } from '@/lib/utils';

const PlatformTable = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  ),
);
PlatformTable.displayName = 'PlatformTable';

const PlatformTableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('[&_tr]:border-b [&_tr]:border-[hsl(var(--platform-border)/0.5)]', className)} {...props} />
  ),
);
PlatformTableHeader.displayName = 'PlatformTableHeader';

const PlatformTableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  ),
);
PlatformTableBody.displayName = 'PlatformTableBody';

const PlatformTableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn('border-t border-[hsl(var(--platform-border)/0.5)] bg-[hsl(var(--platform-bg-card)/0.3)] font-medium [&>tr]:last:border-b-0', className)} {...props} />
  ),
);
PlatformTableFooter.displayName = 'PlatformTableFooter';

const PlatformTableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-[hsl(var(--platform-border)/0.5)] transition-colors hover:bg-[hsl(var(--platform-bg-hover)/0.5)] data-[state=selected]:bg-[hsl(var(--platform-bg-hover)/0.7)]',
        className,
      )}
      {...props}
    />
  ),
);
PlatformTableRow.displayName = 'PlatformTableRow';

const PlatformTableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-11 px-4 text-left align-middle font-medium text-[hsl(var(--platform-foreground-muted))] [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  ),
);
PlatformTableHead.displayName = 'PlatformTableHead';

const PlatformTableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('px-4 py-3 align-middle text-[hsl(var(--platform-foreground)/0.85)] [&:has([role=checkbox])]:pr-0', className)} {...props} />
  ),
);
PlatformTableCell.displayName = 'PlatformTableCell';

const PlatformTableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn('mt-4 text-sm text-[hsl(var(--platform-foreground-muted))]', className)} {...props} />
  ),
);
PlatformTableCaption.displayName = 'PlatformTableCaption';

export {
  PlatformTable,
  PlatformTableHeader,
  PlatformTableBody,
  PlatformTableFooter,
  PlatformTableHead,
  PlatformTableRow,
  PlatformTableCell,
  PlatformTableCaption,
};
