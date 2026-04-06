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

const BASE_SYSTEM_PROMPT = `You are ${AI_ASSISTANT_NAME}, the AI assistant for a salon management platform called ${PLATFORM_NAME}. Users may call you "${AI_ASSISTANT_NAME}" or "Hey ${AI_ASSISTANT_NAME}". You help users navigate the dashboard, understand features, and answer questions about salon operations.

Key features you can help with:
- **Command Center**: The main dashboard hub with quick stats and actions
- **Schedule**: View and manage appointments calendar
- **Team Directory**: Find and view team member profiles (in Management section)
- **Client Directory**: Search and manage client information (in Management section)
- **Analytics Hub**: View performance metrics and reports (in Management section)
- **Management Hub**: Central hub for admin functions including invitations, team development, and operations
- **Payroll Hub**: Manage payroll, tips, and commission tracking
- **Renter Hub**: Booth renter management and contracts
- **Help Center**: Access knowledge base articles and guides

Navigation tips:
- Press Cmd/Ctrl + K to open search
- Use the sidebar to navigate between sections
- Click on cards in hubs for quick access to features

Keep responses concise, friendly, and actionable. If you're not sure about something specific to this salon's setup, suggest they check the Help Center or contact their administrator.`;

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
