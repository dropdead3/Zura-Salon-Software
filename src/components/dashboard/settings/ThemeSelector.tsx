import { useState } from 'react';
import { Check, Palette, Loader2, Plus, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useServiceCategoryThemes,
  useApplyCategoryTheme,
  useSaveAsCustomTheme,
  useDeleteCategoryTheme,
  ServiceCategoryTheme,
} from '@/hooks/useCategoryThemes';

interface ColorMapValue {
  bg: string;
  text: string;
  abbr: string;
}

interface ThemeSelectorProps {
  currentColors: Record<string, ColorMapValue>;
}

// Get 4 preview colors from a theme
function getPreviewColors(colors: Record<string, string>): string[] {
  const colorValues = Object.values(colors).filter(c => !c.startsWith('gradient:') && c !== '#1a1a1a' && c !== '#2d2d2d');
  return colorValues.slice(0, 4);
}

// Check if current colors roughly match a theme
function isThemeActive(themeColors: Record<string, string>, currentColors: Record<string, string>): boolean {
  // Check if at least 70% of colors match
  const themeEntries = Object.entries(themeColors);
  if (themeEntries.length === 0) return false;
  
  let matches = 0;
  themeEntries.forEach(([category, color]) => {
    if (currentColors[category.toLowerCase()]?.toLowerCase() === color.toLowerCase()) {
      matches++;
    }
  });
  
  return matches / themeEntries.length >= 0.7;
}

export function ThemeSelector({ currentColors }: ThemeSelectorProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeDescription, setNewThemeDescription] = useState('');

  const { data: themes, isLoading } = useServiceCategoryThemes();
  const applyTheme = useApplyCategoryTheme();
  const saveTheme = useSaveAsCustomTheme();
  const deleteTheme = useDeleteCategoryTheme();

  const handleApplyTheme = (theme: ServiceCategoryTheme) => {
    applyTheme.mutate(theme, {
      onSuccess: () => {
        toast.success(`Applied "${theme.name}" theme`);
      },
      onError: () => {
        toast.error('Failed to apply theme');
      },
    });
  };

  const handleSaveTheme = () => {
    if (!newThemeName.trim()) {
      toast.error('Please enter a theme name');
      return;
    }

    saveTheme.mutate(
      { name: newThemeName.trim(), description: newThemeDescription.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Saved "${newThemeName}" theme`);
          setSaveDialogOpen(false);
          setNewThemeName('');
          setNewThemeDescription('');
        },
        onError: (error: Error) => {
          if (error.message.includes('duplicate')) {
            toast.error('A theme with this name already exists');
          } else {
            toast.error('Failed to save theme');
          }
        },
      }
    );
  };

  const handleDeleteTheme = (theme: ServiceCategoryTheme, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTheme.mutate(theme.id, {
      onSuccess: () => {
        toast.success(`Deleted "${theme.name}" theme`);
      },
      onError: () => {
        toast.error('Failed to delete theme');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading themes...</span>
      </div>
    );
  }

  // Build lowercase map of current colors for comparison
  const currentColorsLower: Record<string, string> = {};
  Object.entries(currentColors).forEach(([key, value]) => {
    currentColorsLower[key.toLowerCase()] = value.bg;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Quick Themes</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {themes?.map((theme) => {
          const previewColors = getPreviewColors(theme.colors);
          const isActive = isThemeActive(theme.colors, currentColorsLower);
          const isApplying = applyTheme.isPending;
          
          return (
            <Tooltip key={theme.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleApplyTheme(theme)}
                  disabled={isApplying}
                  className={cn(
                    'relative flex items-center gap-2 px-3 py-2 rounded-full border transition-all',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    isActive 
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30' 
                      : 'border-border bg-card hover:border-primary/50',
                    isApplying && 'opacity-50 cursor-wait'
                  )}
                >
                  {/* Color preview dots */}
                  <div className="flex -space-x-1">
                    {previewColors.map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full border border-background shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  
                  {/* Theme name */}
                  <span className="text-sm font-medium">{theme.name}</span>
                  
                  {/* Active check */}
                  {isActive && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                   
                  {/* Delete button for custom themes */}
                  {theme.is_custom && (
                    <button
                      onClick={(e) => handleDeleteTheme(theme, e)}
                      className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="text-xs font-medium">{theme.name}</p>
                {theme.description && (
                  <p className="text-[10px] text-muted-foreground">{theme.description}</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {/* Save current as theme button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setSaveDialogOpen(true)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed transition-all',
                'border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary',
                'hover:scale-[1.02] active:scale-[0.98]'
              )}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-sm">Save Current</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Save current colors as a custom theme</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Save Theme Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Save as Custom Theme
            </DialogTitle>
            <DialogDescription>
              Save your current color configuration as a reusable theme.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="theme-name" className="text-sm font-medium">
                Theme Name
              </label>
              <Input
                id="theme-name"
                placeholder="My Custom Theme"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="theme-description" className="text-sm font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="theme-description"
                placeholder="A brief description of your theme"
                value={newThemeDescription}
                onChange={(e) => setNewThemeDescription(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTheme} disabled={saveTheme.isPending}>
              {saveTheme.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Theme'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
