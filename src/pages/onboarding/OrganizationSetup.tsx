import { Helmet } from "react-helmet-async";
import { useSearchParams, Navigate } from "react-router-dom";
import { BootLuxeLoader } from "@/components/ui/BootLuxeLoader";
import { useAuth } from "@/contexts/AuthContext";

/**
 * OrganizationSetup — full-screen wizard host.
 *
 * Wave 1 placeholder. Wave 2 ships the registry-driven step renderer,
 * intro screen, and Steps 0–3.
 */
export default function OrganizationSetup() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const orgId = params.get("org");

  if (loading) return <BootLuxeLoader fullScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!orgId) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Set up your workspace — Zura</title>
        <meta
          name="description"
          content="Configure your Zura workspace in a guided 7-step flow."
        />
      </Helmet>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="space-y-6 text-center">
          <h1 className="font-display text-2xl tracking-wide uppercase">
            Setup wizard
          </h1>
          <p className="text-muted-foreground">
            Most software asks you to fit it. Zura asks how you operate, then fits itself to you.
          </p>
          <p className="text-sm text-muted-foreground">
            The full wizard arrives in Wave 2. Schema, edge functions, and signup are now ready.
          </p>
        </div>
      </div>
    </div>
  );
}
