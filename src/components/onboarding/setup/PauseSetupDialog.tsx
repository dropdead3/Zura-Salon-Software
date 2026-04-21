import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "./Chip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PauseSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  currentStepKey: string;
}

const REASONS = [
  { value: "need_info", label: "I need to gather information" },
  { value: "consult_team", label: "I want to discuss with my team" },
  { value: "not_ready", label: "I'm not ready to commit to choices" },
  { value: "no_time", label: "I don't have time right now" },
  { value: "other", label: "Other" },
];

/**
 * PauseSetupDialog — canonical exit pattern. Saves a pause event with reason
 * for internal funnel telemetry, then routes to dashboard.
 */
export function PauseSetupDialog({
  open,
  onOpenChange,
  orgId,
  currentStepKey,
}: PauseSetupDialogProps) {
  const navigate = useNavigate();
  const [reason, setReason] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [saving, setSaving] = useState(false);

  const handlePause = async () => {
    setSaving(true);
    try {
      await supabase.from("setup_pause_events" as any).insert({
        org_id: orgId,
        step_key: currentStepKey,
        reason_chip: reason,
        free_text: freeText || null,
      } as any);
      toast.success("Setup paused. Resume anytime from your dashboard.");
      navigate("/dashboard");
    } catch {
      navigate("/dashboard");
    } finally {
      setSaving(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide uppercase text-base">
            Pause setup
          </DialogTitle>
          <DialogDescription className="font-sans">
            Your progress is saved. You can resume from your dashboard anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="font-sans text-xs text-muted-foreground">
              What's holding you up? (optional)
            </label>
            <div className="grid gap-2">
              {REASONS.map((r) => (
                <Chip
                  key={r.value}
                  label={r.label}
                  selected={reason === r.value}
                  onClick={() => setReason(r.value)}
                />
              ))}
            </div>
          </div>
          {reason === "other" && (
            <Textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Tell us more (optional)"
              className="resize-none"
              rows={3}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep going
          </Button>
          <Button onClick={handlePause} disabled={saving}>
            Pause and exit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
