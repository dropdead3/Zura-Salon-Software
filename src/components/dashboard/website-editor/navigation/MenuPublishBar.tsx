import { AlertCircle, CheckCircle2, AlertTriangle, Rocket, FileEdit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditorCard } from '../EditorCard';
import { usePublishMenu, useWebsiteMenu } from '@/hooks/useWebsiteMenus';
import type { ValidationIssue } from './useMenuValidation';
import { toast } from 'sonner';
import { tokens } from '@/lib/design-tokens';

interface MenuPublishBarProps {
  menuId: string;
  menuName: string;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export function MenuPublishBar({ menuId, menuName, errors, warnings }: MenuPublishBarProps) {
  const publishMenu = usePublishMenu();
  const { data: items } = useWebsiteMenu(menuId);
  const hasErrors = errors.length > 0;
  const draftCount = (items ?? []).filter(i => !i.is_published).length;

  const handlePublish = () => {
    publishMenu.mutate(
      { menuId, changeSummary: `Published ${menuName}` },
      {
        onSuccess: () => toast.success(`${menuName} published`),
        onError: (e) => toast.error(`Failed to publish: ${e.message}`),
      }
    );
  };

  return (
    <EditorCard title="Publish" icon={Rocket}>
      <div className="space-y-3">
        {/* Draft indicator */}
        {draftCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-foreground bg-muted/50 px-2.5 py-2 rounded-md">
            <FileEdit className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
            <span>
              {draftCount} unpublished change{draftCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Validation Summary */}
        {errors.length > 0 && (
          <div className="space-y-1.5">
            {errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{e.message}</span>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}

        {errors.length === 0 && warnings.length === 0 && draftCount === 0 && (
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>All checks passed — published</span>
          </div>
        )}

        {/* Publish Button */}
        <Button
          className="w-full"
          size={tokens.button.card}
          onClick={handlePublish}
          disabled={hasErrors || publishMenu.isPending || draftCount === 0}
        >
          {publishMenu.isPending
            ? 'Publishing...'
            : draftCount === 0
              ? 'Nothing to publish'
              : `Publish ${menuName}`}
        </Button>

        {hasErrors && (
          <p className="text-[10px] text-muted-foreground text-center">
            Resolve errors above before publishing
          </p>
        )}
      </div>
    </EditorCard>
  );
}
