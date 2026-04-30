import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { colorThemes, type ColorTheme } from "@/hooks/useColorTheme";
import type { StepProps } from "./types";

interface Step1Data {
  business_name: string;
  legal_name: string;
  business_type: "single_location" | "multi_location" | "franchise" | "independent";
  timezone: string;
}

const BUSINESS_TYPES: Array<{ value: Step1Data["business_type"]; label: string }> = [
  { value: "single_location", label: "Single location salon or spa" },
  { value: "multi_location", label: "Multi-location group" },
  { value: "franchise", label: "Franchise" },
  { value: "independent", label: "Independent operator" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

// Curated 4-tile preview set — the rest of the gallery lives in the Site
// Design panel post-onboarding. Ordering matches the dashboard's canonical
// display order so wizard ↔ dashboard recognition holds.
const WIZARD_THEME_TILES: ColorTheme[] = ["zura", "cream-lux", "neon", "rosewood"];

// Same legacy localStorage key useColorTheme reads at module load and that
// useCommitOrgSetup.seedWebsiteThemeFromDashboard reads at commit time. By
// writing here we make the commit-time seed deterministic instead of
// implicit (was: "whatever the operator clicked in the dashboard chrome").
const WIZARD_THEME_STORAGE_KEY = "dd-color-theme";


/**
 * Step 1 — Business identity. Soft-required. All fields validate or skip flow.
 */
export function Step1Identity({ initialData, onChange, onValidityChange }: StepProps<Step1Data>) {
  const [businessName, setBusinessName] = useState((initialData?.business_name as string) ?? "");
  const [legalName, setLegalName] = useState((initialData?.legal_name as string) ?? "");
  const [businessType, setBusinessType] = useState<Step1Data["business_type"]>(
    (initialData?.business_type as Step1Data["business_type"]) ?? "single_location",
  );
  const [timezone, setTimezone] = useState(
    (initialData?.timezone as string) ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  // Wave 13G.A — track whether the user actually changed business_type so the
  // orchestrator doesn't overwrite a backfilled multi_location with the default.
  const [businessTypeTouched, setBusinessTypeTouched] = useState(false);

  // Wizard theme picker — local UI state mirrors localStorage. The
  // commit-time seed in useCommitOrgSetup.seedWebsiteThemeFromDashboard
  // reads this same key, so picking a tile here makes the seed deterministic
  // and intentional rather than implicit (was: "whatever the operator
  // happened to click in dashboard chrome before commit"). Defaults to
  // whatever's already stored so re-entering the wizard doesn't reset.
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme>(() => {
    if (typeof window === "undefined") return "zura";
    const stored = window.localStorage.getItem(WIZARD_THEME_STORAGE_KEY);
    return (stored as ColorTheme) ?? "zura";
  });

  const handleThemePick = (id: ColorTheme) => {
    setSelectedTheme(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WIZARD_THEME_STORAGE_KEY, id);
    }
  };

  useEffect(() => {
    onChange({
      business_name: businessName,
      legal_name: legalName,
      business_type: businessType,
      timezone,
      // Sentinel read by commit-org-setup step_1_identity handler.
      __touched_business_type: businessTypeTouched,
    } as Step1Data & { __touched_business_type: boolean });
    onValidityChange(businessName.trim().length > 0);
  }, [businessName, legalName, businessType, timezone, businessTypeTouched, onChange, onValidityChange]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="business-name" className="font-sans text-sm">
          Business name
        </Label>
        <Input
          id="business-name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Luxe Hair Studio"
          className="font-sans"
        />
        <p className="font-sans text-xs text-muted-foreground">
          What clients and staff see. You can add custom branding later.
        </p>
      </div>

      {/* Theme picker — sets the visitor-facing site theme. Stored to
          localStorage; useCommitOrgSetup seeds it into site_settings on
          successful commit so the new org's public site doesn't whiplash
          to cream-lux on first preview. Operators can change it any time
          from Site Design → Site Theme. */}
      <div className="space-y-2">
        <Label className="font-sans text-sm">Site theme</Label>
        <div className="grid grid-cols-4 gap-2">
          {WIZARD_THEME_TILES.map((id) => {
            const t = colorThemes.find((c) => c.id === id);
            if (!t) return null;
            const isActive = selectedTheme === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleThemePick(id)}
                aria-pressed={isActive}
                aria-label={`Pick ${t.name} theme`}
                title={`${t.name} — ${t.description}`}
                className={cn(
                  "group relative rounded-lg border overflow-hidden transition-all text-left",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-foreground/30",
                )}
              >
                {/* Mini-hero mock — same shapes as the dashboard's Site Theme
                    tiles for cross-surface recognition. */}
                <div
                  className="h-12 relative overflow-hidden"
                  style={{ backgroundColor: t.lightPreview.bg }}
                  aria-hidden="true"
                >
                  <div
                    className="absolute left-1.5 top-1.5 h-1 w-7 rounded-sm"
                    style={{ backgroundColor: t.lightPreview.primary }}
                  />
                  <div
                    className="absolute left-1.5 top-3.5 h-[3px] w-9 rounded-sm opacity-70"
                    style={{ backgroundColor: t.lightPreview.accent }}
                  />
                  <div
                    className="absolute left-1.5 top-5 h-[3px] w-6 rounded-sm opacity-50"
                    style={{ backgroundColor: t.lightPreview.accent }}
                  />
                  <div
                    className="absolute right-1.5 bottom-1.5 h-2 w-5 rounded-full"
                    style={{ backgroundColor: t.lightPreview.primary }}
                  />
                </div>
                <div className="px-1.5 py-1 bg-card">
                  <p className="font-display uppercase tracking-wider text-[9px] text-foreground truncate">
                    {t.name}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="font-sans text-xs text-muted-foreground">
          Sets the look visitors see on your public site. Browse all themes
          from Site Design after setup.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="legal-name" className="font-sans text-sm">
          Legal entity name <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="legal-name"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          placeholder="Luxe Hair Studio LLC"
          className="font-sans"
        />
        <p className="font-sans text-xs text-muted-foreground">
          Used on invoices, payroll, and tax documents.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="font-sans text-sm">Business structure</Label>
        <Select
          value={businessType}
          onValueChange={(v) => {
            setBusinessType(v as Step1Data["business_type"]);
            setBusinessTypeTouched(true);
          }}
        >
          <SelectTrigger className="font-sans">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value} className="font-sans">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="font-sans text-sm">Primary timezone</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger className="font-sans">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz} className="font-sans">
                {tz.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="font-sans text-xs text-muted-foreground">
          Drives the dashboard clock, schedule grid, and reporting day boundaries.
        </p>
      </div>
    </div>
  );
}
