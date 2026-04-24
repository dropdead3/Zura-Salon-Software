import { useState, useRef } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ColorWheelPicker } from '@/components/ui/color-wheel-picker';
import { 
  useCustomTheme, 
  editableTokens, 
  getCSSVariable, 
  hslStringToHex,
  hexToHslString,
  themePresets,
  type ThemePresetKey,
} from '@/hooks/useCustomTheme';
import { useThemeAuthority } from '@/hooks/useThemeAuthority';
import { 
  Palette, 
  Save, 
  RotateCcw, 
  X, 
  Download, 
  Upload,
  Loader2,
  AlertCircle,
  Sparkles,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ThemeEditorProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
}

interface ColorSwatchProps {
  tokenKey: string;
  label: string;
  isEditMode: boolean;
  isModified: boolean;
  onColorChange: (key: string, hex: string) => void;
}

function ColorSwatch({ tokenKey, label, isEditMode, isModified, onColorChange }: ColorSwatchProps) {
  const currentValue = getCSSVariable(tokenKey);
  const hexValue = hslStringToHex(currentValue);
  
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="relative">
        {isEditMode ? (
          <ColorWheelPicker
            value={hexValue}
            onChange={(hex) => onColorChange(tokenKey, hex)}
            colorType="primary"
            label={label}
          />
        ) : (
          <div 
            className="w-7 h-7 rounded-md border border-border shadow-sm"
            style={{ backgroundColor: `hsl(${currentValue})` }}
          />
        )}
        {isModified && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-gold rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <p className="text-xs text-muted-foreground font-mono truncate">
          --{tokenKey}
        </p>
      </div>
    </div>
  );
}

interface PresetCardProps {
  presetKey: ThemePresetKey;
  preset: typeof themePresets[ThemePresetKey];
  onSelect: (key: ThemePresetKey) => void;
}

function PresetCard({ presetKey, preset, onSelect }: PresetCardProps) {
  return (
    <button
      onClick={() => onSelect(presetKey)}
      className="group flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-gold/50 hover:bg-muted/30 transition-all min-w-[100px]"
    >
      {/* Color preview circles */}
      <div className="flex -space-x-2">
        {preset.preview.map((color, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
            style={{ backgroundColor: `hsl(${color})` }}
          />
        ))}
      </div>
      <div className="text-center">
        <p className="text-xs font-medium group-hover:text-gold transition-colors">{preset.name}</p>
      </div>
    </button>
  );
}

export function ThemeEditor({ isEditMode, onToggleEditMode }: ThemeEditorProps) {
  const {
    pendingChanges,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    setVariable,
    saveTheme,
    discardChanges,
    resetToDefault,
    exportTheme,
    importTheme,
    applyPreset,
  } = useCustomTheme();
  const { canEditOrgTheme } = useThemeAuthority();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState('presets');
  
  const handleColorChange = (key: string, hex: string) => {
    if (hex === 'transparent') return;
    setVariable(key, hex);
  };
  
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      importTheme(content);
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleDiscard = () => {
    discardChanges();
    onToggleEditMode();
  };
  
  const handleSave = async () => {
    const success = await saveTheme();
    if (success) {
      onToggleEditMode();
    }
  };
  
  const categories = [
    { id: 'presets', label: 'Presets', tokens: [] },
    { id: 'core', label: 'Core', tokens: editableTokens.core },
    { id: 'brand', label: 'Brand', tokens: editableTokens.brand },
    { id: 'special', label: 'Special', tokens: editableTokens.special },
    { id: 'ui', label: 'UI', tokens: editableTokens.ui },
    { id: 'sidebar', label: 'Sidebar', tokens: editableTokens.sidebar },
  ];
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <Card className="border-gold/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-gold" />
            <CardTitle className="text-lg">Theme Editor</CardTitle>
            {!canEditOrgTheme && (
              <Badge variant="outline" className="gap-1.5">
                <Lock className="w-3 h-3" />
                Account Owner only
              </Badge>
            )}
            {canEditOrgTheme && hasUnsavedChanges && (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3 h-3" />
                Unsaved changes
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!canEditOrgTheme ? (
              <Button
                variant="outline"
                size={tokens.button.card}
                onClick={exportTheme}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            ) : isEditMode ? (
              <>
                <Button
                  variant="outline"
                  size={tokens.button.card}
                  onClick={handleDiscard}
                  disabled={isSaving}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size={tokens.button.card} disabled={isSaving}>
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset to Default Theme?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all your custom color settings and restore the default theme. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={resetToDefault}>
                        Reset Theme
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <Button
                  size={tokens.button.card}
                  onClick={handleSave}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="bg-gold hover:bg-gold/90 text-gold-foreground"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size={tokens.button.card}
                  onClick={exportTheme}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size={tokens.button.card}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Import
                </Button>
                
                <Button
                  size={tokens.button.card}
                  onClick={onToggleEditMode}
                  className="bg-gold hover:bg-gold/90 text-gold-foreground"
                >
                  <Palette className="w-4 h-4 mr-1" />
                  Edit Theme
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {!canEditOrgTheme && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <Lock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Theme Editor is read-only</p>
              <p className="text-xs text-muted-foreground">
                Brand colors and typography are organization-wide. Only the Account
                Owner can edit them. You can still export the current palette.
              </p>
            </div>
          </div>
        )}
        {canEditOrgTheme && isEditMode ? (
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              {categories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                  {cat.id === 'presets' && <Sparkles className="w-3 h-3 mr-1" />}
                  {cat.label}
                  {cat.tokens.length > 0 && cat.tokens.some(t => pendingChanges[t.key]) && (
                    <span className="ml-1 w-1.5 h-1.5 bg-gold rounded-full" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* Presets Tab */}
            <TabsContent value="presets">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Choose a preset as a starting point, then customize individual colors.
                </p>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2">
                    {(Object.keys(themePresets) as ThemePresetKey[]).map(key => (
                      <PresetCard
                        key={key}
                        presetKey={key}
                        preset={themePresets[key]}
                        onSelect={applyPreset}
                      />
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <p className="text-xs text-muted-foreground mt-2">
                  After selecting a preset, switch to the color tabs to fine-tune individual colors.
                </p>
              </div>
            </TabsContent>
            
            {/* Color category tabs */}
            {categories.filter(cat => cat.id !== 'presets').map(cat => (
              <TabsContent key={cat.id} value={cat.id}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                  {cat.tokens.map(token => (
                    <ColorSwatch
                      key={token.key}
                      tokenKey={token.key}
                      label={token.label}
                      isEditMode={isEditMode}
                      isModified={!!pendingChanges[token.key]}
                      onColorChange={handleColorChange}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-sm text-muted-foreground">
            <p>Click <strong>Edit Theme</strong> to customize colors or choose from preset themes like Midnight, Sunset, or Forest.</p>
            <p className="mt-2 text-xs">Tip: Use <strong>Export</strong> to backup your theme or share it with others.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
