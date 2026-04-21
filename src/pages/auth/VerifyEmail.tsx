import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, MailCheck, Loader2 } from "lucide-react";

/**
 * Email verification landing page.
 * - Reads `?token_hash=…&type=signup` (Supabase link format)
 * - Confirms the email
 * - Soft-routes back to wizard or dashboard
 *
 * Note: per doctrine, email verification is requested ONCE at registration —
 * the wizard does not re-gate on it. This page is for the link click.
 */
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error" | "idle">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (!tokenHash || !type) {
      setStatus("idle");
      return;
    }
    setStatus("verifying");
    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: type as any })
      .then(({ error }) => {
        if (error) {
          setStatus("error");
          setMessage(error.message);
        } else {
          setStatus("success");
        }
      });
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Helmet>
        <title>Verify your email — Zura</title>
      </Helmet>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <MailCheck className="w-5 h-5 text-primary" />
          </div>
          <CardTitle className="font-display text-xl tracking-wide">
            Verify your email
          </CardTitle>
          <CardDescription>
            We sent a verification link to your inbox. Click it to confirm — you can keep using Zura in the meantime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "verifying" && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying…
            </div>
          )}
          {status === "success" && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Your email is verified. You can close this tab.
              </AlertDescription>
            </Alert>
          )}
          {status === "error" && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
