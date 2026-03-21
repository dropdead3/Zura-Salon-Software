import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { tokens } from '@/lib/design-tokens';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, Palette, Type, Sparkles, MousePointer, Square, CircleDot, Layers, Sun, Moon, Search, X, Play, Code } from "lucide-react";
import React, { useState, useMemo, useEffect } from "react";
import { useDashboardTheme } from "@/contexts/DashboardThemeContext";
import { SPECIAL_GRADIENTS } from "@/utils/categoryColors";
import { getRoleColorClasses, ROLE_COLORS } from "@/components/dashboard/RoleColorPicker";
import { ThemeEditor } from "@/components/dashboard/ThemeEditor";
import { TypographyEditor } from "@/components/dashboard/TypographyEditor";

// CopyButton component defined OUTSIDE the DesignSystem component
interface CopyButtonProps {
  text: string;
  label: string;
  size?: "sm" | "xs";
  copiedItem: string | null;
  onCopy: (text: string, label: string) => void;
}

const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  ({ text, label, size = "sm", copiedItem, onCopy }, ref) => (
    <button
      ref={ref}
      onClick={() => onCopy(text, label)}
      className={`${size === "xs" ? "p-0.5" : "p-1"} rounded hover:bg-accent transition-colors`}
      title="Copy to clipboard"
    >
      {copiedItem === label ? (
        <Check className={`${size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} text-success-foreground`} />
      ) : (
        <Copy className={`${size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} text-muted-foreground`} />
      )}
    </button>
  )
);
CopyButton.displayName = "CopyButton";

const DesignSystem = () => {
  const { toast } = useToast();
  const { theme, setTheme } = useDashboardTheme();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openSections, setOpenSections] = useState<string[]>(["playground", "colors", "gradients", "typography"]);
  const [isThemeEditMode, setIsThemeEditMode] = useState(false);
  const [isTypographyEditMode, setIsTypographyEditMode] = useState(false);

  // Playground state
  const [buttonVariant, setButtonVariant] = useState<"default" | "secondary" | "outline" | "ghost" | "link" | "destructive">("default");
  const [buttonSize, setButtonSize] = useState<"sm" | "default" | "lg" | "icon">("default");
  const [buttonLabel, setButtonLabel] = useState("Click me");
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const [badgeVariant, setBadgeVariant] = useState<"default" | "secondary" | "outline" | "destructive" | "glass" | "glass-dark">("default");
  const [badgeText, setBadgeText] = useState("Status");

  const [cardTitle, setCardTitle] = useState("Card Title");
  const [cardDescription, setCardDescription] = useState("Card description text");
  const [cardContent, setCardContent] = useState("This is the main content of the card.");
  const [cardShadow, setCardShadow] = useState("shadow-lg");
  const [cardRadius, setCardRadius] = useState("rounded-xl");
  const [cardHasButton, setCardHasButton] = useState(true);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
    setTimeout(() => setCopiedItem(null), 2000);
  };

  // Semantic color tokens
  const semanticColors = [
    { name: "background", variable: "--background", usage: "Page backgrounds", light: "40 30% 96%", dark: "0 0% 4%" },
    { name: "foreground", variable: "--foreground", usage: "Primary text", light: "0 0% 8%", dark: "40 20% 92%" },
    { name: "primary", variable: "--primary", usage: "CTA buttons, links", light: "0 0% 8%", dark: "40 20% 92%" },
    { name: "secondary", variable: "--secondary", usage: "Secondary actions", light: "40 20% 94%", dark: "0 0% 12%" },
    { name: "muted", variable: "--muted", usage: "Disabled states, subtle bg", light: "40 15% 88%", dark: "0 0% 15%" },
    { name: "accent", variable: "--accent", usage: "Highlights, hover states", light: "40 25% 90%", dark: "35 20% 18%" },
    { name: "oat", variable: "--oat", usage: "Brand accent color", light: "35 35% 82%", dark: "35 30% 25%" },
    { name: "gold", variable: "--gold", usage: "Premium badges, awards", light: "38 70% 38%", dark: "38 85% 55%" },
    { name: "success", variable: "--success", usage: "Availability, positive", light: "145 40% 85%", dark: "145 30% 25%" },
    { name: "destructive", variable: "--destructive", usage: "Errors, warnings", light: "0 62% 50%", dark: "0 62% 50%" },
  ];

  // Typography scale with design rules
  const typography = [
    { class: "font-display", font: "Termina", weight: "Medium (500 only)", transform: "UPPERCASE, tracking-wider (0.08em)", usage: "Headlines, buttons, navigation", rule: "NEVER use font-bold or font-semibold" },
    { class: "font-sans", font: "Aeonik Pro", weight: "400-500", transform: "Normal (never uppercase)", usage: "Body text, paragraphs, UI labels", rule: "NEVER use uppercase or all-caps" },
    { class: "font-serif", font: "Laguna", weight: "700", transform: "Normal", usage: "Editorial accents (rarely used)", rule: null },
    { class: "font-script", font: "Sloop Script", weight: "400", transform: "Normal", usage: "Decorative elements", rule: null },
  ];

  // Border radius scale
  const borderRadius = [
    { class: "rounded-none", value: "0", usage: "Sharp edges" },
    { class: "rounded-xs", value: "2px", usage: "Very subtle rounding" },
    { class: "rounded-sm", value: "3px", usage: "Subtle rounding" },
    { class: "rounded-md", value: "5px", usage: "Default inputs" },
    { class: "rounded-lg", value: "10px", usage: "Cards, containers" },
    { class: "rounded-xl", value: "20px", usage: "Large cards" },
    { class: "rounded-2xl", value: "30px", usage: "Premium cards, dialogs" },
    { class: "rounded-3xl", value: "40px", usage: "Hero sections" },
    { class: "rounded-full", value: "9999px", usage: "Pills, avatars, badges" },
  ];

  // Animation classes
  const animations = [
    { class: "animate-fade-in", description: "Fade in with slight upward movement", duration: "0.3s" },
    { class: "animate-fade-in-up", description: "Fade in with more pronounced upward movement", duration: "0.6s" },
    { class: "animate-scale-in", description: "Scale up from 95% with fade", duration: "0.2s" },
    { class: "animate-slide-in-left", description: "Slide in from left", duration: "0.4s" },
    { class: "animate-slide-in-right", description: "Slide in from right", duration: "0.4s" },
    { class: "animate-blur-in", description: "Blur to sharp with fade", duration: "0.5s" },
    { class: "animate-float", description: "Gentle floating motion", duration: "3s infinite" },
    { class: "animate-shimmer", description: "Loading shimmer effect", duration: "3s infinite" },
    { class: "animate-shine", description: "Shine sweep effect", duration: "8s infinite" },
    { class: "animate-bounce-once", description: "Single bounce for emphasis", duration: "0.3s" },
    { class: "animate-swing", description: "Pendulum swing motion", duration: "1s infinite" },
  ];

  // Utility effect classes
  const effectClasses = [
    { class: "hover-lift", description: "Lift card on hover with shadow", code: "hover:-translate-y-1 hover:shadow-lg" },
    { class: "card-glow", description: "Glow effect on hover", code: "hover:shadow-[0_0_30px_rgba(0,0,0,0.1)]" },
    { class: "btn-hover-fill", description: "Background fill animation on buttons", code: "Custom CSS transition" },
    { class: "link-underline", description: "Animated underline for links", code: "after:scale-x animation" },
    { class: "badge-shine", description: "Reflective shine on badges", code: "Gradient overlay animation" },
    { class: "shimmer", description: "Skeleton loading shimmer", code: "Background position animation" },
    { class: "gold-shimmer", description: "Premium gold shimmer effect", code: "Gold gradient animation" },
    { class: "pulse-glow", description: "Pulsing glow for emphasis", code: "Box-shadow pulse" },
  ];

  // Shadow classes
  const shadows = [
    { class: "shadow-sm", usage: "Subtle elevation" },
    { class: "shadow", usage: "Default elevation" },
    { class: "shadow-md", usage: "Medium elevation" },
    { class: "shadow-lg", usage: "High elevation" },
    { class: "shadow-xl", usage: "Very high elevation" },
    { class: "shadow-2xl", usage: "Premium cards" },
  ];

  // Scrollbar classes
  const scrollbarClasses = [
    { class: "scrollbar-minimal", description: "4px thin scrollbar, subtle styling" },
    { class: "scrollbar-thin", description: "6px rounded scrollbar" },
    { class: "scrollbar-hide", description: "Hidden scrollbar (still scrollable)" },
  ];

  // Filter function
  const filterItems = <T extends Record<string, any>>(items: T[], fields: (keyof T)[]): T[] => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      fields.some(field => String(item[field]).toLowerCase().includes(query))
    );
  };

  // Filtered data
  const filteredColors = filterItems(semanticColors, ["name", "variable", "usage"]);
  const filteredTypography = filterItems(typography, ["class", "font", "usage"]);
  const filteredBorderRadius = filterItems(borderRadius, ["class", "usage"]);
  const filteredAnimations = filterItems(animations, ["class", "description"]);
  const filteredEffects = filterItems(effectClasses, ["class", "description"]);
  const filteredShadows = filterItems(shadows, ["class", "usage"]);
  const filteredScrollbars = filterItems(scrollbarClasses, ["class", "description"]);
  
  const filteredGradients = useMemo(() => {
    if (!searchQuery) return Object.entries(SPECIAL_GRADIENTS);
    const query = searchQuery.toLowerCase();
    return Object.entries(SPECIAL_GRADIENTS).filter(([key, gradient]) =>
      key.toLowerCase().includes(query) || gradient.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const filteredRoleColors = useMemo(() => {
    if (!searchQuery) return ROLE_COLORS;
    const query = searchQuery.toLowerCase();
    return ROLE_COLORS.filter(color => color.name.toLowerCase().includes(query));
  }, [searchQuery]);

  // Count matches per section
  const sectionCounts = useMemo(() => ({
    colors: filteredColors.length,
    gradients: filteredGradients.length,
    typography: filteredTypography.length,
    buttons: searchQuery ? (searchQuery.toLowerCase().includes("button") ? 1 : 0) : 6,
    badges: filteredRoleColors.length + (searchQuery ? 0 : 6),
    radius: filteredBorderRadius.length,
    animations: filteredAnimations.length,
    effects: filteredEffects.length,
    shadows: filteredShadows.length,
    scrollbar: filteredScrollbars.length,
    playground: searchQuery ? (searchQuery.toLowerCase().includes("playground") || searchQuery.toLowerCase().includes("preview") ? 1 : 0) : 1,
  }), [searchQuery, filteredColors, filteredGradients, filteredTypography, filteredRoleColors, filteredBorderRadius, filteredAnimations, filteredEffects, filteredShadows, filteredScrollbars]);

  // Auto-expand sections with matches when searching
  // Only auto-expand sections when search query changes, not on every render
  const prevSearchQuery = React.useRef(searchQuery);
  useEffect(() => {
    // Only run when searchQuery actually changes
    if (prevSearchQuery.current !== searchQuery) {
      prevSearchQuery.current = searchQuery;
      
      if (searchQuery) {
        // Expand sections that have matches
        const sectionsWithMatches = Object.entries(sectionCounts)
          .filter(([, count]) => count > 0)
          .map(([key]) => key);
        setOpenSections(sectionsWithMatches);
      }
      // When clearing search, don't reset - keep user's current selection
    }
  }, [searchQuery, sectionCounts]);

  // Generated code for playground
  const buttonCode = `<Button variant="${buttonVariant}" size="${buttonSize}"${buttonDisabled ? " disabled" : ""}>${buttonLabel}</Button>`;
  const badgeCode = `<Badge variant="${badgeVariant}">${badgeText}</Badge>`;
  const cardCode = `<Card className="${cardShadow} ${cardRadius}">
  <CardHeader>
    <CardTitle>${cardTitle}</CardTitle>
    <CardDescription>${cardDescription}</CardDescription>
  </CardHeader>
  <CardContent>
    <p>${cardContent}</p>
  </CardContent>${cardHasButton ? `
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>` : ""}
</Card>`;

  const renderSectionHeader = (icon: React.ReactNode, title: string, sectionKey: string) => (
    <div className="flex items-center gap-3">
      {icon}
      <span className="font-display uppercase tracking-wide">{title}</span>
      {searchQuery && sectionCounts[sectionKey as keyof typeof sectionCounts] > 0 && (
        <Badge variant="secondary" className="ml-2 text-xs">
          {sectionCounts[sectionKey as keyof typeof sectionCounts]}
        </Badge>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display uppercase tracking-wide">Design System</h1>
            <p className="text-muted-foreground mt-1">Visual reference for all design tokens and components</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search colors, classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size={tokens.button.card}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {searchQuery && Object.values(sectionCounts).every(c => c === 0) && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
            <Button variant="link" onClick={() => setSearchQuery("")}>Clear search</Button>
          </Card>
        )}

        {/* Theme Editors */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ThemeEditor 
            isEditMode={isThemeEditMode} 
            onToggleEditMode={() => setIsThemeEditMode(!isThemeEditMode)} 
          />
          <TypographyEditor
            isEditMode={isTypographyEditMode}
            onToggleEditMode={() => setIsTypographyEditMode(!isTypographyEditMode)}
          />
        </div>

        <Accordion 
          type="multiple" 
          value={openSections}
          onValueChange={setOpenSections}
          className="space-y-4"
        >
          {/* Component Playground */}
          {sectionCounts.playground > 0 && (
            <AccordionItem value="playground" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                {renderSectionHeader(<Play className="h-5 w-5 text-gold" />, "Component Playground", "playground")}
              </AccordionTrigger>
              <AccordionContent>
                <Tabs defaultValue="button" className="pb-4">
                  <TabsList className="mb-4">
                    <TabsTrigger value="button">Button</TabsTrigger>
                    <TabsTrigger value="badge">Badge</TabsTrigger>
                    <TabsTrigger value="card">Card</TabsTrigger>
                  </TabsList>

                  {/* Button Builder */}
                  <TabsContent value="button">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4 p-4 rounded-lg bg-background border">
                        <h4 className="font-display uppercase tracking-wide text-sm">Controls</h4>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Variant</Label>
                            <Select value={buttonVariant} onValueChange={(v) => setButtonVariant(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">default</SelectItem>
                                <SelectItem value="secondary">secondary</SelectItem>
                                <SelectItem value="outline">outline</SelectItem>
                                <SelectItem value="ghost">ghost</SelectItem>
                                <SelectItem value="link">link</SelectItem>
                                <SelectItem value="destructive">destructive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Size</Label>
                            <Select value={buttonSize} onValueChange={(v) => setButtonSize(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sm">sm</SelectItem>
                                <SelectItem value="default">default</SelectItem>
                                <SelectItem value="lg">lg</SelectItem>
                                <SelectItem value="icon">icon</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Label</Label>
                            <Input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={buttonDisabled} onCheckedChange={setButtonDisabled} id="btn-disabled" />
                            <Label htmlFor="btn-disabled" className="text-xs">Disabled</Label>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-8 rounded-lg bg-muted/30 border flex items-center justify-center min-h-[120px]">
                          <Button variant={buttonVariant} size={buttonSize} disabled={buttonDisabled}>
                            {buttonSize === "icon" ? <Sparkles className="h-4 w-4" /> : buttonLabel}
                          </Button>
                        </div>
                        <div className="relative">
                          <pre className="p-3 rounded-lg bg-foreground/5 border text-xs font-mono overflow-x-auto">
                            <code>{buttonCode}</code>
                          </pre>
                          <div className="absolute top-2 right-2">
                            <CopyButton text={buttonCode} label="Button code" copiedItem={copiedItem} onCopy={copyToClipboard} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Badge Builder */}
                  <TabsContent value="badge">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4 p-4 rounded-lg bg-background border">
                        <h4 className="font-display uppercase tracking-wide text-sm">Controls</h4>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Variant</Label>
                            <Select value={badgeVariant} onValueChange={(v) => setBadgeVariant(v as any)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">default</SelectItem>
                                <SelectItem value="secondary">secondary</SelectItem>
                                <SelectItem value="outline">outline</SelectItem>
                                <SelectItem value="destructive">destructive</SelectItem>
                                <SelectItem value="glass">glass</SelectItem>
                                <SelectItem value="glass-dark">glass-dark</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Text</Label>
                            <Input value={badgeText} onChange={(e) => setBadgeText(e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className={`p-8 rounded-lg border flex items-center justify-center min-h-[120px] ${badgeVariant === "glass-dark" ? "bg-foreground" : "bg-muted/30"}`}>
                          <Badge variant={badgeVariant}>{badgeText}</Badge>
                        </div>
                        <div className="relative">
                          <pre className="p-3 rounded-lg bg-foreground/5 border text-xs font-mono overflow-x-auto">
                            <code>{badgeCode}</code>
                          </pre>
                          <div className="absolute top-2 right-2">
                            <CopyButton text={badgeCode} label="Badge code" copiedItem={copiedItem} onCopy={copyToClipboard} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Card Builder */}
                  <TabsContent value="card">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4 p-4 rounded-lg bg-background border">
                        <h4 className="font-display uppercase tracking-wide text-sm">Controls</h4>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Title</Label>
                            <Input value={cardTitle} onChange={(e) => setCardTitle(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Description</Label>
                            <Input value={cardDescription} onChange={(e) => setCardDescription(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Content</Label>
                            <Textarea value={cardContent} onChange={(e) => setCardContent(e.target.value)} rows={2} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Shadow</Label>
                              <Select value={cardShadow} onValueChange={setCardShadow}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="shadow-sm">shadow-sm</SelectItem>
                                  <SelectItem value="shadow">shadow</SelectItem>
                                  <SelectItem value="shadow-md">shadow-md</SelectItem>
                                  <SelectItem value="shadow-lg">shadow-lg</SelectItem>
                                  <SelectItem value="shadow-xl">shadow-xl</SelectItem>
                                  <SelectItem value="shadow-2xl">shadow-2xl</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Radius</Label>
                              <Select value={cardRadius} onValueChange={setCardRadius}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="rounded-lg">rounded-lg</SelectItem>
                                  <SelectItem value="rounded-xl">rounded-xl</SelectItem>
                                  <SelectItem value="rounded-2xl">rounded-2xl</SelectItem>
                                  <SelectItem value="rounded-3xl">rounded-3xl</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={cardHasButton} onCheckedChange={setCardHasButton} id="card-btn" />
                            <Label htmlFor="card-btn" className="text-xs">Include Footer Button</Label>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-6 rounded-lg bg-muted/30 border min-h-[200px]">
                          <Card className={`${cardShadow} ${cardRadius}`}>
                            <CardHeader>
                              <CardTitle>{cardTitle}</CardTitle>
                              <CardDescription>{cardDescription}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <p>{cardContent}</p>
                            </CardContent>
                            {cardHasButton && (
                              <CardFooter>
                                <Button>Action</Button>
                              </CardFooter>
                            )}
                          </Card>
                        </div>
                        <div className="relative">
                          <pre className="p-3 rounded-lg bg-foreground/5 border text-xs font-mono overflow-x-auto max-h-32">
                            <code>{cardCode}</code>
                          </pre>
                          <div className="absolute top-2 right-2">
                            <CopyButton text={cardCode} label="Card code" copiedItem={copiedItem} onCopy={copyToClipboard} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Color Palette */}
          {sectionCounts.colors > 0 && (
            <AccordionItem value="colors" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                {renderSectionHeader(<Palette className="h-5 w-5 text-gold" />, "Color Palette", "colors")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 pb-4">
                  {filteredColors.map((color) => (
                    <div key={color.name} className="flex items-center gap-4 p-3 rounded-lg bg-background border">
                      <div className="flex gap-2">
                        <button 
                          className="w-12 h-12 rounded-lg border shadow-sm hover:ring-2 ring-primary transition-all cursor-pointer"
                          style={{ backgroundColor: `hsl(${color.light})` }}
                          title="Click to copy light HSL"
                          onClick={() => copyToClipboard(color.light, `${color.name} light`)}
                        />
                        <button 
                          className="w-12 h-12 rounded-lg border shadow-sm hover:ring-2 ring-primary transition-all cursor-pointer"
                          style={{ backgroundColor: `hsl(${color.dark})` }}
                          title="Click to copy dark HSL"
                          onClick={() => copyToClipboard(color.dark, `${color.name} dark`)}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                            {color.variable}
                          </code>
                          <CopyButton text={color.variable} label={color.name} copiedItem={copiedItem} onCopy={copyToClipboard} />
                          <CopyButton text={`hsl(var(${color.variable}))`} label={`${color.name} css`} copiedItem={copiedItem} onCopy={copyToClipboard} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{color.usage}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground font-mono space-y-1">
                        <div className="flex items-center justify-end gap-1">
                          Light: {color.light}
                          <CopyButton text={color.light} label={`${color.name} light hsl`} size="xs" copiedItem={copiedItem} onCopy={copyToClipboard} />
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          Dark: {color.dark}
                          <CopyButton text={color.dark} label={`${color.name} dark hsl`} size="xs" copiedItem={copiedItem} onCopy={copyToClipboard} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {(!searchQuery || "trend".includes(searchQuery.toLowerCase()) || "indicator".includes(searchQuery.toLowerCase())) && (
                  <>
                    <Separator className="my-4" />
                    <div className="pb-4">
                      <h4 className="font-display uppercase tracking-wide text-sm mb-3">Trend Indicator Colors</h4>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
                          <button 
                            className="w-8 h-8 rounded-full hover:ring-2 ring-primary transition-all cursor-pointer" 
                            style={{ backgroundColor: 'hsl(145 50% 45%)' }}
                            onClick={() => copyToClipboard("145 50% 45%", "uptrend")}
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <code className="text-sm font-mono">145 50% 45%</code>
                              <CopyButton text="145 50% 45%" label="uptrend hsl" size="xs" copiedItem={copiedItem} onCopy={copyToClipboard} />
                            </div>
                            <p className="text-xs text-muted-foreground">Uptrend (green)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
                          <button 
                            className="w-8 h-8 rounded-full hover:ring-2 ring-primary transition-all cursor-pointer" 
                            style={{ backgroundColor: 'hsl(0 60% 60%)' }}
                            onClick={() => copyToClipboard("0 60% 60%", "downtrend")}
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <code className="text-sm font-mono">0 60% 60%</code>
                              <CopyButton text="0 60% 60%" label="downtrend hsl" size="xs" copiedItem={copiedItem} onCopy={copyToClipboard} />
                            </div>
                            <p className="text-xs text-muted-foreground">Downtrend (red)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Special Gradients */}
          {sectionCounts.gradients > 0 && (
            <AccordionItem value="gradients" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                {renderSectionHeader(<Sparkles className="h-5 w-5 text-gold" />, "Special Gradients", "gradients")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                  {filteredGradients.map(([key, gradient]) => (
                    <Card key={key} className="overflow-hidden">
                      <button 
                        className="h-24 w-full flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
                        style={{ background: gradient.background }}
                        onClick={() => copyToClipboard(gradient.background, gradient.name)}
                      >
                        <span 
                          className="font-display uppercase tracking-wide text-sm"
                          style={{ color: gradient.textColor }}
                        >
                          {gradient.name}
                        </span>
                      </button>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <code className="text-xs font-mono">{key}</code>
                          <CopyButton text={gradient.background} label={gradient.name} copiedItem={copiedItem} onCopy={copyToClipboard} />
                        </div>
                        <div 
                          className="mt-2 h-6 rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ 
                            background: gradient.glassStroke,
                            opacity: 0.5 
                          }}
                          title="Click to copy glass stroke"
                          onClick={() => copyToClipboard(gradient.glassStroke, `${gradient.name} glass`)}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Typography */}
          {sectionCounts.typography > 0 && (
            <AccordionItem value="typography" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                {renderSectionHeader(<Type className="h-5 w-5 text-gold" />, "Typography", "typography")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pb-4">
                  {filteredTypography.map((type) => (
                    <div key={type.class} className="p-4 rounded-lg bg-background border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{type.class}</code>
                          <CopyButton text={type.class} label={type.font} copiedItem={copiedItem} onCopy={copyToClipboard} />
                        </div>
                        <span className="text-xs text-muted-foreground">{type.weight}</span>
                      </div>
                      <div className={type.class === 'font-display' ? 'font-display uppercase tracking-wide' : type.class}>
                        <span className="text-2xl">{type.font}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{type.usage}</p>
                      {type.rule && (
                        <div className={`mt-3 p-2 rounded ${type.class === 'font-display' ? 'bg-destructive/10 border border-destructive/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                          <p className={`text-xs font-medium ${type.class === 'font-display' ? 'text-destructive' : 'text-amber-600'}`}>
                            ⚠️ {type.rule}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}

                  {!searchQuery && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-3">
                        <h4 className="font-display uppercase tracking-wide text-sm">Size Scale</h4>
                        <div className="p-4 rounded-lg bg-background border space-y-2">
                          {[
                            { class: "text-xs", label: "Extra Small", preview: "The quick brown fox" },
                            { class: "text-sm", label: "Small", preview: "The quick brown fox" },
                            { class: "text-base", label: "Base", preview: "The quick brown fox" },
                            { class: "text-lg", label: "Large", preview: "The quick brown fox" },
                            { class: "text-xl", label: "Extra Large", preview: "The quick brown fox" },
                            { class: "text-2xl", label: "2XL", preview: "The quick brown fox" },
                            { class: "text-3xl", label: "3XL", preview: "The quick brown fox" },
                          ].map((size) => (
                            <div key={size.class} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded w-20">{size.class}</code>
                                <span className={size.class}>{size.preview}</span>
                              </div>
                              <CopyButton text={size.class} label={size.class} size="xs" copiedItem={copiedItem} onCopy={copyToClipboard} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Buttons */}
          {sectionCounts.buttons > 0 && (
            <AccordionItem value="buttons" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                {renderSectionHeader(<MousePointer className="h-5 w-5 text-gold" />, "Buttons", "buttons")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 pb-4">
                  <div>
                    <h4 className="font-display uppercase tracking-wide text-sm mb-3">Variants</h4>
                    <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-background border">
                      {[
                        { variant: "default", label: "Default" },
                        { variant: "secondary", label: "Secondary" },
                        { variant: "outline", label: "Outline" },
                        { variant: "ghost", label: "Ghost" },
                        { variant: "link", label: "Link" },
                        { variant: "destructive", label: "Destructive" },
                      ].map(({ variant, label }) => (
                        <div key={variant} className="space-y-2 text-center">
                          <Button variant={variant as any}>{label}</Button>
                          <div className="flex items-center justify-center gap-1">
                            <code className="text-xs">variant="{variant}"</code>
                            <CopyButton text={`variant="${variant}"`} label={`btn-${variant}`} size="xs" copiedItem={copiedItem} onCopy={copyToClipboard} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display uppercase tracking-wide text-sm mb-3">Sizes</h4>
                    <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg bg-background border">
                      {[
                        { size: "sm", label: "Small" },
                        { size: "default", label: "Default" },
                        { size: "lg", label: "Large" },
                      ].map(({ size, label }) => (
                        <div key={size} className="space-y-2 text-center">
                          <Button size={size as any}>{label}</Button>
                          <div className="flex items-center justify-center gap-1">
                            <code className="text-xs">size="{size}"</code>
                            <CopyButton text={`size="${size}"`} label={`size-${size}`} size="xs" copiedItem={copiedItem} onCopy={copyToClipboard} />
                          </div>
                        </div>
                      ))}
                      <div className="space-y-2 text-center">
                        <Button size="icon"><Sparkles className="h-4 w-4" /></Button>
                        <div className="flex items-center justify-center gap-1">
                          <code className="text-xs">size="icon"</code>
                          <CopyButton text={`size="icon"`} label="size-icon" size="xs" copiedItem={copiedItem} onCopy={copyToClipboard} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Badges */}
          {sectionCounts.badges > 0 && (
            <AccordionItem value="badges" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                {renderSectionHeader(<CircleDot className="h-5 w-5 text-gold" />, "Badges", "badges")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 pb-4">
                  {!searchQuery && (
                    <div>
                      <h4 className="font-display uppercase tracking-wide text-sm mb-3">Variants</h4>
                      <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-background border">
                        {[
                          { variant: "default", label: "Default", dark: false },
                          { variant: "secondary", label: "Secondary", dark: false },
                          { variant: "outline", label: "Outline", dark: false },
                          { variant: "destructive", label: "Destructive", dark: false },
                          { variant: "glass", label: "Glass", dark: false },
                          { variant: "glass-dark", label: "Glass Dark", dark: true },
                        ].map(({ variant, label, dark }) => (
                          <div key={variant} className={`space-y-2 text-center ${dark ? "p-2 bg-foreground rounded" : ""}`}>
                            <Badge variant={variant as any}>{label}</Badge>
                            <div className={`flex items-center justify-center gap-1 ${dark ? "text-background" : ""}`}>
                              <code className="text-xs">variant="{variant}"</code>
                              <CopyButton text={`variant="${variant}"`} label={`badge-${variant}`} size="xs" copiedItem={copiedItem} onCopy={copyToClipboard} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredRoleColors.length > 0 && (
                    <div>
                      <h4 className="font-display uppercase tracking-wide text-sm mb-3">Role Colors</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 p-4 rounded-lg bg-background border">
                        {filteredRoleColors.map((color) => {
                          const classes = getRoleColorClasses(color.name);
                          return (
                            <div key={color.name} className="space-y-2 text-center">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${classes.bg} ${classes.text}`}>
                                {color.name}
                              </span>
                              <div className="flex items-center justify-center gap-1">
                                <code className="text-xs">{color.name}</code>
                                <CopyButton text={color.name} label={`role-${color.name}`} size="xs" copiedItem={copiedItem} onCopy={copyToClipboard} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Border Radius */}
          {sectionCounts.radius > 0 && (
            <AccordionItem value="radius" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                {renderSectionHeader(<Square className="h-5 w-5 text-gold" />, "Border Radius", "radius")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 pb-4">
                  {filteredBorderRadius.map((radius) => (
                    <div key={radius.class} className="text-center space-y-2">
                      <div 
                        className={`w-16 h-16 mx-auto bg-primary ${radius.class} flex items-center justify-center cursor-pointer hover:ring-2 ring-gold transition-all`}
                        onClick={() => copyToClipboard(radius.class, radius.class)}
                      >
                        <span className="text-primary-foreground text-xs">{radius.value}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <code className="text-xs font-mono">{radius.class}</code>
                        <CopyButton text={radius.class} label={radius.class} size="xs" copiedItem={copiedItem} onCopy={copyToClipboard} />
                      </div>
                      <p className="text-xs text-muted-foreground">{radius.usage}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Animations */}
          {sectionCounts.animations > 0 && (
            <AccordionItem value="animations" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                {renderSectionHeader(<Sparkles className="h-5 w-5 text-gold" />, "Animations", "animations")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pb-4">
                  {filteredAnimations.map((anim) => (
                    <div key={anim.class} className="flex items-center gap-4 p-3 rounded-lg bg-background border">
                      <div className={`w-12 h-12 rounded-lg bg-primary ${anim.class}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{anim.class}</code>
                          <CopyButton text={anim.class} label={anim.class} copiedItem={copiedItem} onCopy={copyToClipboard} />
                        </div>
                        <p className="text-sm text-muted-foreground">{anim.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{anim.duration}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Effect Classes */}
          {sectionCounts.effects > 0 && (
            <AccordionItem value="effects" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                {renderSectionHeader(<Layers className="h-5 w-5 text-gold" />, "Effect Utilities", "effects")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid sm:grid-cols-2 gap-4 pb-4">
                  {filteredEffects.map((effect) => (
                    <div key={effect.class} className="p-4 rounded-lg bg-background border">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">.{effect.class}</code>
                        <CopyButton text={effect.class} label={effect.class} copiedItem={copiedItem} onCopy={copyToClipboard} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{effect.description}</p>
                      
                      <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-center min-h-[80px]">
                        {effect.class === 'hover-lift' && (
                          <div className="w-20 h-20 bg-card rounded-lg shadow hover-lift cursor-pointer flex items-center justify-center text-xs">
                            Hover me
                          </div>
                        )}
                        {effect.class === 'card-glow' && (
                          <div className="w-20 h-20 bg-card rounded-lg card-glow cursor-pointer flex items-center justify-center text-xs">
                            Hover me
                          </div>
                        )}
                        {effect.class === 'shimmer' && (
                          <div className="w-full h-8 rounded shimmer" />
                        )}
                        {effect.class === 'gold-shimmer' && (
                          <div className="px-4 py-2 rounded-full gold-shimmer text-white text-sm font-display uppercase">
                            Premium
                          </div>
                        )}
                        {effect.class === 'pulse-glow' && (
                          <div className="w-12 h-12 rounded-full bg-gold pulse-glow" />
                        )}
                        {(effect.class === 'btn-hover-fill' || effect.class === 'link-underline' || effect.class === 'badge-shine') && (
                          <span className="text-xs text-muted-foreground">See CSS in index.css</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Shadows */}
          {sectionCounts.shadows > 0 && (
            <AccordionItem value="shadows" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                {renderSectionHeader(<Layers className="h-5 w-5 text-gold" />, "Shadows & Depth", "shadows")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-6 pb-4 p-4 rounded-lg bg-muted/30">
                  {filteredShadows.map((shadow) => (
                    <div key={shadow.class} className="space-y-2 text-center">
                      <div 
                        className={`w-24 h-24 bg-card rounded-xl ${shadow.class} flex items-center justify-center cursor-pointer hover:ring-2 ring-gold transition-all`}
                        onClick={() => copyToClipboard(shadow.class, shadow.class)}
                      >
                        <span className="text-xs">{shadow.class.replace("shadow-", "")}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <code className="text-xs">{shadow.class}</code>
                        <CopyButton text={shadow.class} label={shadow.class} size="xs" copiedItem={copiedItem} onCopy={copyToClipboard} />
                      </div>
                      <p className="text-xs text-muted-foreground">{shadow.usage}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Scrollbar Utilities */}
          {sectionCounts.scrollbar > 0 && (
            <AccordionItem value="scrollbar" className="border rounded-xl px-4 bg-card">
              <AccordionTrigger className="hover:no-underline">
                {renderSectionHeader(<Layers className="h-5 w-5 text-gold" />, "Scrollbar Utilities", "scrollbar")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid sm:grid-cols-3 gap-4 pb-4">
                  {filteredScrollbars.map((scrollbar) => (
                    <div key={scrollbar.class} className="p-4 rounded-lg bg-background border">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">.{scrollbar.class}</code>
                        <CopyButton text={scrollbar.class} label={scrollbar.class} copiedItem={copiedItem} onCopy={copyToClipboard} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{scrollbar.description}</p>
                      <div className={`mt-3 h-24 overflow-y-auto ${scrollbar.class} border rounded p-2`}>
                        <div className="h-48 bg-muted/30 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </DashboardLayout>
  );
};

export default DesignSystem;
