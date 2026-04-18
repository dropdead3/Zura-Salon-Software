import { createRoot } from "react-dom/client";
import { importWithRetry } from "@/lib/importWithRetry";
import { PLATFORM_NAME } from "@/lib/brand";
import { BootLuxeLoader } from "@/components/ui/BootLuxeLoader";
import "./index.css";

function BootstrapFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <BootLuxeLoader />
    </div>
  );
}

function BootstrapError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <BootLuxeLoader />
        </div>
        <h1 className="font-display text-xl uppercase tracking-[0.16em]">
          Unexpected interruption
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {PLATFORM_NAME} hit a startup issue. Reload to try again.
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

    // Wait for fonts to load before rendering the app (max 3s timeout)
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);

    root.render(<App />);
  } catch (error) {
    console.error("Failed to bootstrap application", error);
    root.render(<BootstrapError />);
  }
}

void bootstrap();
