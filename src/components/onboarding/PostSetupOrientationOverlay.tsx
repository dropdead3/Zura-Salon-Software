import { useEffect, useState } from "react";
import { ArrowRight, X, Compass, Wallet, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ORIENTATION_STORAGE_KEY = "zura.orientation.completed";

interface Pointer {
  icon: typeof Compass;
  title: string;
  body: string;
}

const POINTERS: Pointer[] = [
  {
    icon: Compass,
    title: "Command Center",
    body: "Here's the system that runs your daily operations. The day's most important lever is always the first thing you see.",
  },
  {
    icon: Wallet,
    title: "Compensation Hub",
    body: "Here's where your compensation lives. Commission rules, payroll runs, and tip distribution — all editable, never locked.",
  },
  {
    icon: Users,
    title: "Your Team",
    body: "Here's where your team will live once you invite them. Roles, levels, and career pathways are already structured.",
  },
];

/**
 * PostSetupOrientationOverlay — one-time, dismissible 3-pointer tour.
 * Shown after the user completes setup and lands on the dashboard.
 * Persists completion locally + on the user record (best-effort).
 */
export function PostSetupOrientationOverlay() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const completed = localStorage.getItem(ORIENTATION_STORAGE_KEY);
    if (completed) return;
    // Brief delay so the dashboard has paint time
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [user]);

  const dismiss = async () => {
    setOpen(false);
    localStorage.setItem(ORIENTATION_STORAGE_KEY, new Date().toISOString());
    // Best-effort persistence on user metadata (non-blocking)
    if (user?.id) {
      try {
        await supabase.auth.updateUser({
          data: { orientation_completed_at: new Date().toISOString() },
        });
      } catch {
        // silent — local persistence is enough
      }
    }
  };

  const next = () => {
    if (step < POINTERS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  if (!open) return null;
  const pointer = POINTERS[step];
  const Icon = pointer.icon;
  const isLast = step === POINTERS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <div className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Orientation · {step + 1} of {POINTERS.length}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss orientation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center">
            <Icon className="w-5 h-5 text-foreground" />
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-xl tracking-wide font-medium">
              {pointer.title}
            </h2>
            <p className="font-sans text-sm text-muted-foreground leading-relaxed">
              {pointer.body}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5">
              {POINTERS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === step ? "w-6 bg-foreground" : "w-2 bg-border"
                  }`}
                />
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={next}
              className="gap-1.5"
            >
              {isLast ? "Got it" : "Next"}
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
