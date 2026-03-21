import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

function isLikelyIdSegment(segment: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || segment.length >= 18;
}

function humanizeSegment(segment: string) {
  const s = segment.replace(/[-_]+/g, ' ').trim();
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  showBreadcrumbs?: boolean;
  className?: string;
};

export function PageHeader({ title, description, actions, showBreadcrumbs = true, className }: PageHeaderProps) {
  const location = useLocation();

  const breadcrumb = (() => {
    if (!showBreadcrumbs) return null;
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'dashboard' || parts.length <= 2) return null;

    const crumbs: Array<{ label: string; href?: string }> = [{ label: 'Dashboard', href: '/dashboard' }];
    let href = '/dashboard';
    for (const seg of parts.slice(1)) {
      href += `/${seg}`;
      const label =
        seg === 'admin'
          ? 'Admin'
          : seg === 'platform'
            ? 'Platform'
            : isLikelyIdSegment(seg)
              ? 'Detail'
              : humanizeSegment(seg);
      crumbs.push({ label, href });
    }

    return (
      <Breadcrumb>
        <BreadcrumbList className="text-xs">
          {crumbs.map((c, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <React.Fragment key={`${c.label}-${idx}`}>
                <BreadcrumbItem>
                  {isLast || !c.href ? (
                    <BreadcrumbPage className="text-xs">{c.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild className="text-xs">
                      <Link to={c.href}>{c.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    );
  })();

  return (
    <div className={cn('px-4 lg:px-6 pt-4 pb-3', className)}>
      {breadcrumb && <div className="pb-2">{breadcrumb}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-base tracking-[0.16em] uppercase truncate">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

