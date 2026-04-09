import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { loadZuraConfig, buildZuraPromptPrefix } from "../_shared/zura-config-loader.ts";
import { AI_ASSISTANT_NAME_DEFAULT as AI_ASSISTANT_NAME, PLATFORM_NAME } from "../_shared/brand.ts";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody, ValidationError, z } from "../_shared/validation.ts";

const AssistantSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })).min(1),
  organizationId: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
  userRole: z.string().max(50).optional(),
});

const BASE_SYSTEM_PROMPT = `You are ${AI_ASSISTANT_NAME}, the AI assistant for ${PLATFORM_NAME}. Users may call you "${AI_ASSISTANT_NAME}" or "Hey ${AI_ASSISTANT_NAME}". You help users navigate the dashboard, understand features, and answer questions about salon operations.

## EXACT SIDEBAR NAVIGATION (use these names and paths only)

### Main (visible to all)
- **Command Center** — Main dashboard with quick stats, pinned cards, and hub links
- **Schedule** — Appointment calendar view
- **Team Chat** — Internal messaging

### My Tools (staff-facing)
- **Today's Prep** — Daily appointment prep checklist (stylists)
- **My Mixing** — Color mixing station (stylists)
- **Waitlist** — Walk-in waitlist management (admin/manager/front desk)
- **My Stats** — Personal performance metrics
- **My Pay** — Pay statements and commission details
- **Training** — Video training modules
- **New-Client Engine Program** — Client acquisition program (stylists)
- **Team Leaderboard** — Performance rankings
- **Shift Swaps** — Request and manage shift trades
- **Rewards** — Staff rewards program
- **Ring the Bell** — Celebrate wins (stylists)
- **My Level Progress** — Graduation/level tracking (stylists)

### Manage (admin/leadership only)
- **Analytics Hub** — Performance metrics, sales analytics, utilization reports, KPI dashboards
- **Report Generator** — Custom report builder
- **Operations Hub** — Team management, scheduling, announcements, recruiting, PTO, performance reviews

### System (admin only)
- **Roles & Controls Hub** — Permissions, role assignments, invitations, access control. Path: Roles & Controls Hub in the sidebar under System
- **Settings** — Organization settings, integrations, billing

### Sub-pages accessible via hubs
- Team Directory (inside Operations Hub)
- Client Directory, Client Health, Re-engagement, Client Feedback (inside Operations Hub or Analytics Hub)
- Campaigns, SEO Workshop, Lead Management (inside Operations Hub)
- Appointments & Transactions, Sales Analytics, Operational Analytics, Staff Utilization (inside Analytics Hub)
- Day Rate Settings, Day Rate Calendar (inside Settings or Operations Hub)

## ROLE ACCESS RULES
- **Super Admin / Admin**: Full access to all sections including Manage and System
- **Manager**: My Tools + Manage sections (Analytics Hub, Operations Hub). No access to System (Roles & Controls Hub, Settings)
- **Stylist / Stylist Assistant**: My Tools section only (stats, pay, training, leaderboard, ring the bell, shift swaps)
- **Front Desk (Receptionist)**: Waitlist, Schedule, Team Chat, Leaderboard, Shift Swaps

## COMMON TASK ROUTING
- "Change permissions" or "manage roles" → **Roles & Controls Hub** (sidebar > System section)
- "Invite someone" or "add team member" → **Roles & Controls Hub** > Invitations tab
- "View analytics" or "see reports" → **Analytics Hub** (sidebar > Manage section)
- "Manage team" or "team operations" → **Operations Hub** (sidebar > Manage section)
- "View my stats" → **My Stats** (sidebar > My Tools section)
- "Change settings" → **Settings** (sidebar > System section)
- "View schedule" → **Schedule** (sidebar > Main section)
- "Check payroll" or "view pay" → **My Pay** (sidebar > My Tools section)

## CRITICAL RULES
- NEVER fabricate navigation paths. Only reference sections and pages listed above.
- NEVER say "Management Hub > Team Directory > Access tab" — that path does not exist.
- If you are unsure where a feature lives, say so honestly and suggest pressing **Cmd/Ctrl+K** to search.
- When giving directions, use the exact sidebar section and label name (e.g., "Go to **Roles & Controls Hub** in the System section of the sidebar").
- Tailor your guidance to the user's role — don't suggest admin-only pages to stylists.

Keep responses concise, friendly, and actionable.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    // Auth guard
    let authResult;
    try {
      authResult = await requireAuth(req);
    } catch (authErr) {
      return authErrorResponse(authErr, getCorsHeaders(req));
    }
    const { user, supabaseAdmin } = authResult;

    const body = await validateBody(req, AssistantSchema, getCorsHeaders(req));
    const { messages, organizationId, userRole } = body;
    // Verify org access
    try {
      await requireOrgMember(supabaseAdmin, user.id, body.organizationId || body.organization_id);
    } catch (orgErr) {
      return authErrorResponse(orgErr, getCorsHeaders(req));
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Load dynamic Zura config if org is available
    let systemPrompt = BASE_SYSTEM_PROMPT;
    
    if (organizationId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const config = await loadZuraConfig(
          SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY,
          organizationId,
          "ai-assistant",
          userRole || null,
        );
        const prefix = buildZuraPromptPrefix(config);
        if (prefix) {
          systemPrompt = prefix + systemPrompt;
        }
        // Override display name if configured
        if (config.personality?.display_name && config.personality.display_name !== AI_ASSISTANT_NAME) {
          systemPrompt = systemPrompt.replace(new RegExp(`You are ${AI_ASSISTANT_NAME}`, 'g'), `You are ${config.personality.display_name}`);
          systemPrompt = systemPrompt.replace(new RegExp(`"${AI_ASSISTANT_NAME}"`, 'g'), `"${config.personality.display_name}"`);
        }
      } catch (configError) {
        console.error("Failed to load AI config, using defaults:", configError);
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please contact support." }),
          {
            status: 402,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        {
          status: 500,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...getCorsHeaders(req), "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
