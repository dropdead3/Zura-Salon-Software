import { useState, useMemo } from "react";
import { Phone, MessageCircle, Copy, ExternalLink, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ContactActionDialogProps {
  mode: "call" | "text";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  phone: string;
  organizationId: string;
  clientId?: string | null;
  appointmentId?: string | null;
}

const QUICK_TEMPLATES: { label: string; body: (name: string) => string }[] = [
  { label: "Running late?", body: (n) => `Hi ${n}, we're checking in — are you running late for your appointment? Let us know!` },
  { label: "Confirm appt", body: (n) => `Hi ${n}, just confirming your upcoming appointment. Reply YES to confirm or call us to reschedule.` },
  { label: "We have an opening", body: (n) => `Hi ${n}, we just had an earlier opening come up. Want to grab it? Let us know!` },
  { label: "Thank you", body: (n) => `Thanks so much for coming in today, ${n}! We loved having you. — The team` },
];

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1"))
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw;
}

function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "there";
}

export function ContactActionDialog({
  mode,
  open,
  onOpenChange,
  clientName,
  phone,
  organizationId,
  clientId,
  appointmentId,
}: ContactActionDialogProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const formattedPhone = useMemo(() => formatPhone(phone), [phone]);
  const fName = useMemo(() => firstName(clientName), [clientName]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success("Phone number copied");
    } catch {
      toast.error("Couldn't copy — try selecting manually");
    }
  };

  const handleTemplate = (body: string) => {
    setMessage(body);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Type a message first");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-client-sms", {
        body: {
          organization_id: organizationId,
          client_id: clientId ?? null,
          appointment_id: appointmentId ?? null,
          to_phone: phone,
          message: message.trim(),
        },
      });
      if (error) throw error;
      if (data?.success === false) {
        if (data?.twilio_configured === false) {
          toast.error("Twilio not configured. Set it up in Settings → Communications.");
        } else {
          toast.error(data?.error || "Failed to send");
        }
        return;
      }
      toast.success(`Sent to ${fName}`);
      setMessage("");
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const charCount = message.length;
  const segments = Math.max(1, Math.ceil(charCount / 160));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-base tracking-wide flex items-center gap-2">
            {mode === "call" ? (
              <>
                <Phone className="h-4 w-4 text-primary" />
                Call {fName}
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 text-primary" />
                Text {fName}
              </>
            )}
          </DialogTitle>
          <DialogDescription className="font-sans">
            {mode === "call"
              ? "Choose how you'd like to reach this client."
              : "Send a message from your salon's number."}
          </DialogDescription>
        </DialogHeader>

        {mode === "call" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 px-5 py-6 text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-display mb-2">
                {clientName}
              </div>
              <div className="text-2xl font-display tracking-wide">{formattedPhone}</div>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleCopy} className="w-full" size="default">
                <Copy className="h-4 w-4" />
                Copy Number
              </Button>
              <Button asChild variant="outline" className="w-full" size="default">
                <a href={`tel:${phone}`} onClick={() => onOpenChange(false)}>
                  <ExternalLink className="h-4 w-4" />
                  Open in Phone App
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{clientName}</div>
                <div className="text-xs text-muted-foreground font-sans">{formattedPhone}</div>
              </div>
              <Badge variant="secondary" className="shrink-0 font-sans text-[10px]">
                SMS
              </Badge>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-display mb-2">
                Quick Replies
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => handleTemplate(t.body(fName))}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition-colors font-sans"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message…"
                rows={4}
                maxLength={1600}
                className="resize-none rounded-xl"
              />
              <div className="flex items-center justify-between mt-1.5 px-1">
                <span className="text-[10px] text-muted-foreground font-sans">
                  {segments > 1 ? `${segments} segments` : "1 segment"}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-sans tabular-nums",
                    charCount > 160 ? "text-warning" : "text-muted-foreground",
                  )}
                >
                  {charCount} / 160
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="w-full"
                size="default"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send via Salon Number
                  </>
                )}
              </Button>
              <Button asChild variant="outline" className="w-full" size="default">
                <a href={`sms:${phone}`} onClick={() => onOpenChange(false)}>
                  <ExternalLink className="h-4 w-4" />
                  Open in Messages App
                </a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
