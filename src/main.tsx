import { createRoot } from "react-dom/client";
import { importWithRetry } from "@/lib/importWithRetry";
import "./index.css";

function BootstrapFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="font-display text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Loading dashboard
        </p>
      </div>
    </div>
  );
}

function BootstrapError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl uppercase tracking-[0.16em]">
          Unexpected interruption
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Zura hit a startup issue before the dashboard could render. Reload to try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

async function bootstrap() {
  root.render(<BootstrapFallback />);

  try {
    await importWithRetry(() => import("./i18n"), {
      reloadKey: "appBootstrapReloaded",
    });

    const { default: App } = await importWithRetry(() => import("./App.tsx"), {
      reloadKey: "appBootstrapReloaded",
    });

    root.render(<App />);
  } catch (error) {
    console.error("Failed to bootstrap application", error);
    root.render(<BootstrapError />);
  }
}

void bootstrap();
