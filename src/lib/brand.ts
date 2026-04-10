/**
 * Global platform identity tokens.
 *
 * These tokens represent the PLATFORM only.
 * Never use them for Organization, Location, User, or tenant-level entities.
 *
 * To rebrand, change the values here — every UI string, AI prompt, and email
 * that imports these tokens will update automatically.
 */

// ── Core Identity ──────────────────────────────────────────────────────────────
/** The software system name (global infrastructure layer). */
export const PLATFORM_NAME = 'Zura';

/** Full branded name for copyright lines and footers. */
export const PLATFORM_NAME_FULL = 'Zura Platform';

/** Short tagline / descriptor shown alongside the name. */
export const PLATFORM_DESCRIPTOR = 'Guided Intelligence for Scaling Operators';

/** Product category for SEO and meta descriptions. */
export const PLATFORM_CATEGORY = 'Salon Intelligence Platform';

// ── Platform URL ───────────────────────────────────────────────────────────────
/** Canonical platform URL for attribution links and meta tags. */
export const PLATFORM_URL = 'https://getzura.com';

// ── AI Assistant ───────────────────────────────────────────────────────────────
/** Fallback AI assistant identity when no org-level config exists. */
export const AI_ASSISTANT_NAME_DEFAULT = 'Zura';

// ── Product Surface Names ──────────────────────────────────────────────────────
/** Weekly executive intelligence brief. */
export const EXECUTIVE_BRIEF_NAME = 'Zura Weekly Intelligence Brief';

/** Marketing operating system surface. */
export const MARKETING_OS_NAME = 'Zura Marketing OS';

/** Simulation / what-if engine. */
export const SIMULATION_ENGINE_NAME = 'Zura Simulation Engine';

/** Guardrailed automation layer. */
export const AUTOMATION_LAYER_NAME = 'Zura Automation';

// ── Zura Connect (Team & Client Communications) ───────────────────────────────
/** Communications add-on app name. */
export const CONNECT_APP_NAME = 'Zura Connect';

/** Short descriptor for the communications add-on. */
export const CONNECT_DESCRIPTOR = 'Team & Client Communications';
