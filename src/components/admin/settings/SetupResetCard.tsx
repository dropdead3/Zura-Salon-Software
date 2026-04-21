import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tokens } from "@/lib/design-tokens";
import { toast } from "sonner";

/**
 * SetupResetCard — destructive action that wipes synthetic backfill state
 * so the operator can restart the setup wizard from scratch.
 *
 * Preserves wizard-source commit history and only removes inferred rows.
 * Requires "RESET" confirmation typed by the user.
 */
export function SetupResetCard() {
  const { effectiveOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const reset = useMutation({
    mutationFn: async () => {
      if (!effectiveOrganization?.id) throw new Error("No organization");
      const { data, error } = await supabase.functions.invoke(
        "reset-org-setup",
        {
          body: {
            organization_id: effectiveOrganization.id,
            confirm: "RESET",
          },
        },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as {
        success: boolean;
        removed_synthetic_commits: number;
      };
    },
    onSuccess: (data) => {
      toast.success(
        `Setup reset · ${data.removed_synthetic_commits} inferred entries cleared`,
      );
      setOpen(false);
      setConfirmText("");
      queryClient.invalidateQueries({ queryKey: ["org-setup-commit-log"] });
      queryClient.invalidateQueries({ queryKey: ["org-setup-draft"] });
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
    onError: (err: Error) => toast.error("Reset failed: " + err.message),
  });

  if (!effectiveOrganization?.id) return null;

  return (
    <>
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <CardTitle className={tokens.card.title}>
                Restart setup from scratch
              </CardTitle>
              <CardDescription>
                Clears inferred setup entries (drafts, synthetic commit log,
                signup source) so you can run the wizard cleanly. Your
                operational data stays intact.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setOpen(true)}
            className={tokens.button.card}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restart setup
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm setup reset</DialogTitle>
            <DialogDescription>
              This removes inferred setup entries for{" "}
              <span className="font-medium text-foreground">
                {effectiveOrganization.name}
              </span>
              , clears your saved drafts, and resets your signup source. Your
              locations, staff, services, and clients are <strong>not</strong>{" "}
              touched. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-reset" className="font-sans text-sm">
              Type <span className="font-mono font-medium">RESET</span> to
              confirm
            </Label>
            <Input
              id="confirm-reset"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setConfirmText("");
              }}
              disabled={reset.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => reset.mutate()}
              disabled={confirmText !== "RESET" || reset.isPending}
            >
              {reset.isPending ? "Resetting..." : "Yes, reset setup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
