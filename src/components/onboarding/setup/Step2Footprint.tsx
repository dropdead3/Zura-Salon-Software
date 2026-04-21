import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StepProps } from "./types";

interface LocationDraft {
  name: string;
  city: string;
  state: string;
}

interface Step2Data {
  locations: LocationDraft[];
  location_count: number;
  operating_states: string[];
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const STATE_LAW_HINTS: Record<string, string> = {
  CA: "California requires written commission agreements and meal/rest break compliance.",
  NY: "New York Wage Theft Prevention Act requires written wage notices for all employees.",
  IL: "Illinois requires posted commission terms and itemized pay statements.",
  WA: "Washington requires written notice of pay rate changes 30 days in advance.",
};

/**
 * Step 2 — Locations and footprint. Soft-required.
 * Derives operating_states for downstream state-law applicability.
 */
export function Step2Footprint({ initialData, onChange, onValidityChange }: StepProps<Step2Data>) {
  const [locations, setLocations] = useState<LocationDraft[]>(
    (initialData?.locations as LocationDraft[]) ?? [{ name: "", city: "", state: "" }],
  );

  const operatingStates = Array.from(
    new Set(locations.map((l) => l.state).filter(Boolean)),
  );

  useEffect(() => {
    onChange({
      locations,
      location_count: locations.length,
      operating_states: operatingStates,
    });
    onValidityChange(
      locations.length > 0 && locations.every((l) => l.name.trim().length > 0),
    );
  }, [locations, onChange, onValidityChange]);

  const update = (i: number, patch: Partial<LocationDraft>) => {
    setLocations((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const add = () =>
    setLocations((prev) => [...prev, { name: "", city: "", state: "" }]);
  const remove = (i: number) =>
    setLocations((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {locations.map((loc, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card/40 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                Location {i + 1}
              </div>
              {locations.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(i)}
                  className="h-7 px-2 text-muted-foreground"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="font-sans text-xs">Location name</Label>
                <Input
                  value={loc.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="Main Studio"
                  className="font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-sans text-xs">City</Label>
                <Input
                  value={loc.city}
                  onChange={(e) => update(i, { city: e.target.value })}
                  placeholder="Austin"
                  className="font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-sans text-xs">State</Label>
                <Select
                  value={loc.state}
                  onValueChange={(v) => update(i, { state: v })}
                >
                  <SelectTrigger className="font-sans">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s} className="font-sans">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={add} className="w-full gap-2">
        <Plus className="w-4 h-4" />
        Add another location
      </Button>

      {operatingStates.some((s) => STATE_LAW_HINTS[s]) && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2">
          <div className="font-display text-[10px] uppercase tracking-wider text-foreground">
            State law notes
          </div>
          {operatingStates
            .filter((s) => STATE_LAW_HINTS[s])
            .map((s) => (
              <p key={s} className="font-sans text-xs text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">{s}: </span>
                {STATE_LAW_HINTS[s]}
              </p>
            ))}
          <p className="font-sans text-[11px] text-muted-foreground/70 italic mt-1">
            Compliance applicability is auto-applied based on location state.
          </p>
        </div>
      )}
    </div>
  );
}
