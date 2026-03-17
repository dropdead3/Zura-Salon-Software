import { useState } from 'react';
import { tokens } from '@/lib/design-tokens';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Type, 
  Save, 
  RotateCcw, 
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { DashboardLoader } from '@/components/dashboard/DashboardLoader';
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
import { useTypographyTheme, typographyTokens, type TypographyCategory } from '@/hooks/useTypographyTheme';

interface TypographyEditorProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
}

interface FontSizeControlProps {
  tokenKey: string;
  label: string;
  currentValue: string;
  isModified: boolean;
  onChange: (key: string, value: string) => void;
}

function FontSizeControl({ tokenKey, label, currentValue, isModified, onChange }: FontSizeControlProps) {
  // Parse current value (e.g., "1rem", "16px", "14px")
  const parseValue = (val: string): number => {
    if (val.endsWith('rem')) return parseFloat(val) * 16;
    if (val.endsWith('px')) return parseFloat(val);
    return 16;
  };
  
  const numValue = parseValue(currentValue);
  
  return (
    <div className="space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          {isModified && <span className="w-1.5 h-1.5 bg-gold rounded-full" />}
        </div>
        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {currentValue}
        </code>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          value={[numValue]}
          min={10}
          max={72}
          step={1}
          onValueChange={([v]) => onChange(tokenKey, `${v}px`)}
          className="flex-1"
        />
        <Input
          type="number"
          value={numValue}
          onChange={(e) => onChange(tokenKey, `${e.target.value}px`)}
          className="w-16 h-8 text-xs"
          min={10}
          max={72}
        />
      </div>
      <p 
        className="text-muted-foreground truncate" 
        style={{ fontSize: currentValue }}
      >
        Preview text
      </p>
    </div>
  );
}

interface FontWeightControlProps {
  tokenKey: string;
  label: string;
  currentValue: string;
  isModified: boolean;
  onChange: (key: string, value: string) => void;
}

function FontWeightControl({ tokenKey, label, currentValue, isModified, onChange }: FontWeightControlProps) {
  const weights = [
    { value: '300', label: 'Light' },
    { value: '400', label: 'Regular' },
    { value: '500', label: 'Medium' },
    { value: '600', label: 'Semibold' },
    { value: '700', label: 'Bold' },
  ];
  
  return (
    <div className="space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          {isModified && <span className="w-1.5 h-1.5 bg-gold rounded-full" />}
        </div>
      </div>
      <Select value={currentValue} onValueChange={(v) => onChange(tokenKey, v)}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {weights.map(w => (
            <SelectItem key={w.value} value={w.value}>
              <span style={{ fontWeight: parseInt(w.value) }}>{w.label} ({w.value})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p 
        className="text-muted-foreground truncate text-base" 
        style={{ fontWeight: parseInt(currentValue) }}
      >
        Preview text with weight {currentValue}
      </p>
    </div>
  );
}

interface LetterSpacingControlProps {
  tokenKey: string;
  label: string;
  currentValue: string;
  isModified: boolean;
  onChange: (key: string, value: string) => void;
}

function LetterSpacingControl({ tokenKey, label, currentValue, isModified, onChange }: LetterSpacingControlProps) {
  // Parse current value (e.g., "0.05em", "-0.02em")
  const parseValue = (val: string): number => {
    if (val.endsWith('em')) return parseFloat(val) * 100;
    return 0;
  };
  
  const numValue = parseValue(currentValue);
  
  return (
    <div className="space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          {isModified && <span className="w-1.5 h-1.5 bg-gold rounded-full" />}
        </div>
        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {currentValue}
        </code>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          value={[numValue]}
          min={-10}
          max={30}
          step={0.5}
          onValueChange={([v]) => onChange(tokenKey, `${(v / 100).toFixed(3)}em`)}
          className="flex-1"
        />
        <Input
          type="number"
          value={numValue.toFixed(1)}
          onChange={(e) => onChange(tokenKey, `${(parseFloat(e.target.value) / 100).toFixed(3)}em`)}
          className="w-16 h-8 text-xs"
          min={-10}
          max={30}
          step={0.5}
        />
      </div>
      <p 
        className="text-muted-foreground truncate text-base font-display" 
        style={{ letterSpacing: currentValue }}
      >
        LETTER SPACING PREVIEW
      </p>
    </div>
  );
}

interface LineHeightControlProps {
  tokenKey: string;
  label: string;
  currentValue: string;
  isModified: boolean;
  onChange: (key: string, value: string) => void;
}

function LineHeightControl({ tokenKey, label, currentValue, isModified, onChange }: LineHeightControlProps) {
  const numValue = parseFloat(currentValue) || 1.5;
  
  return (
    <div className="space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{label}</Label>
          {isModified && <span className="w-1.5 h-1.5 bg-gold rounded-full" />}
        </div>
        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {currentValue}
        </code>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          value={[numValue * 100]}
          min={100}
          max={250}
          step={5}
          onValueChange={([v]) => onChange(tokenKey, (v / 100).toFixed(2))}
          className="flex-1"
        />
        <Input
          type="number"
          value={numValue.toFixed(2)}
          onChange={(e) => onChange(tokenKey, e.target.value)}
          className="w-16 h-8 text-xs"
          min={1}
          max={2.5}
          step={0.05}
        />
      </div>
      <p 
        className="text-muted-foreground text-sm max-w-xs" 
        style={{ lineHeight: currentValue }}
      >
        This preview text demonstrates how line height affects readability. Multiple lines show the spacing between them.
      </p>
    </div>
  );
}

export function TypographyEditor({ isEditMode, onToggleEditMode }: TypographyEditorProps) {
  const {
    pendingChanges,
    currentValues,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    setVariable,
    saveTheme,
    discardChanges,
    resetToDefault,
  } = useTypographyTheme();
  
  const [activeCategory, setActiveCategory] = useState<TypographyCategory>('fontSize');
  
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
  
  const categories: { id: TypographyCategory; label: string }[] = [
    { id: 'fontSize', label: 'Sizes' },
    { id: 'fontWeight', label: 'Weights' },
    { id: 'letterSpacing', label: 'Tracking' },
    { id: 'lineHeight', label: 'Leading' },
  ];
  
  if (isLoading) {
    return <DashboardLoader size="md" className="py-8" />;
  }
  
  return (
    <Card className="border-gold/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-gold" />
            <CardTitle className="text-lg">Typography Editor</CardTitle>
            {hasUnsavedChanges && (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3 h-3" />
                Unsaved changes
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isEditMode ? (
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
                      <AlertDialogTitle>Reset Typography?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove all your custom typography settings and restore the defaults. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={resetToDefault}>
                        Reset Typography
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
              <Button
                size={tokens.button.card}
                onClick={onToggleEditMode}
                className="bg-gold hover:bg-gold/90 text-gold-foreground"
              >
                <Type className="w-4 h-4 mr-1" />
                Edit Typography
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isEditMode ? (
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as TypographyCategory)}>
            <TabsList className="mb-4">
              {categories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                  {cat.label}
                  {typographyTokens[cat.id].some(t => pendingChanges[t.key]) && (
                    <span className="ml-1 w-1.5 h-1.5 bg-gold rounded-full" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="fontSize">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {typographyTokens.fontSize.map(token => (
                  <FontSizeControl
                    key={token.key}
                    tokenKey={token.key}
                    label={token.label}
                    currentValue={currentValues[token.key] || token.defaultValue}
                    isModified={!!pendingChanges[token.key]}
                    onChange={setVariable}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="fontWeight">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {typographyTokens.fontWeight.map(token => (
                  <FontWeightControl
                    key={token.key}
                    tokenKey={token.key}
                    label={token.label}
                    currentValue={currentValues[token.key] || token.defaultValue}
                    isModified={!!pendingChanges[token.key]}
                    onChange={setVariable}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="letterSpacing">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {typographyTokens.letterSpacing.map(token => (
                  <LetterSpacingControl
                    key={token.key}
                    tokenKey={token.key}
                    label={token.label}
                    currentValue={currentValues[token.key] || token.defaultValue}
                    isModified={!!pendingChanges[token.key]}
                    onChange={setVariable}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="lineHeight">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {typographyTokens.lineHeight.map(token => (
                  <LineHeightControl
                    key={token.key}
                    tokenKey={token.key}
                    label={token.label}
                    currentValue={currentValues[token.key] || token.defaultValue}
                    isModified={!!pendingChanges[token.key]}
                    onChange={setVariable}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-sm text-muted-foreground">
            <p>Click <strong>Edit Typography</strong> to customize font sizes, weights, letter-spacing, and line heights. Changes apply in real-time.</p>
            <p className="mt-2 text-xs">Note: Some typography rules (like Termina's uppercase constraint) are enforced for brand consistency.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
