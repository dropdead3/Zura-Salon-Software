import { createRoot } from "react-dom/client";
import { importWithRetry } from "@/lib/importWithRetry";
import { PLATFORM_NAME } from "@/lib/brand";
import "./index.css";

/**
 * Inline Luxe-style loader for pre-React bootstrap.
 * Mirrors LuxeLoader (static Z mark + thin sliding bar) without React imports —
 * keeps boot visually consistent with the in-app default loader.
 */
function BootLuxeLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3" role="status" aria-label="Loading">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 134.15 133.16"
        className="h-7 w-7 shrink-0 text-foreground/80"
        fill="currentColor"
        aria-hidden="true"
      >
        <g>
          <rect width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="19.97" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="39.93" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="59.9" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="79.86" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="99.83" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="119.8" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="99.83" y="19.8" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="119.8" y="19.8" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="79.86" y="39.6" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="99.83" y="39.6" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="59.9" y="59.4" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="79.86" y="59.4" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="39.93" y="79.2" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="59.9" y="79.2" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="19.97" y="99" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="39.93" y="99" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="19.97" y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="39.93" y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="59.9" y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="79.86" y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="99.83" y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
          <rect x="119.8" y="118.81" width="14.36" height="14.36" rx="2.85" ry="2.85" />
        </g>
      </svg>
      <div className="relative w-32 h-px overflow-hidden rounded-full bg-foreground/10">
        <div
          className="absolute inset-y-0 h-px rounded-full bg-foreground/50"
          style={{
            width: "40%",
            animation: "boot-luxe-bar-slide 1.4s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes boot-luxe-bar-slide {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

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
