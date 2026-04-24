import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { AI_ASSISTANT_NAME_DEFAULT as AI_ASSISTANT_NAME } from "../_shared/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_HOURS = 6;

type RoleTier = "leadership" | "stylist" | "booth_renter" | "front_desk";

function determineRoleTier(roles: string[]): RoleTier {
  if (roles.some((r) => ["super_admin", "admin", "manager"].includes(r))) return "leadership";
  if (roles.includes("booth_renter")) return "booth_renter";
  if (roles.includes("receptionist")) return "front_desk";
  return "stylist";
}

const PERSONAL_ROUTE_MAP = `
INTERNAL ROUTE REFERENCE — Only link to pages this user can access:
- My Stats: /dashboard/stats
- Schedule: /dashboard/schedule
- My Clients: /dashboard/my-clients
- Client Directory: /dashboard/clients
- Leaderboard: /dashboard/leaderboard
- My Pay: /dashboard/my-pay
- Training: /dashboard/training
- Profile: /dashboard/profile
- Ring the Bell: /dashboard/ring-the-bell
- Command Center: /dashboard

Do NOT link to any admin pages, analytics, payroll, team overview, or settings pages.
Example: "Check your trends in [My Stats](/dashboard/stats)" or "Review your book in [My Clients](/dashboard/my-clients)."
Only link when contextually relevant.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey) as any;

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!) as any;
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { forceRefresh } = await req.json().catch(() => ({}));

    // Get user's organization and profile
    const { data: profile } = await supabase
      .from("employee_profiles")
      .select("organization_id, full_name, display_name")
      .eq("user_id", user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.organization_id;

    // Get current roles (real-time, not cached)
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = (rolesData || []).map((r: any) => r.role as string);
    const roleTier = determineRoleTier(roles);

    // Check cache unless force refresh
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("ai_personal_insights")
        .select("*")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .eq("role_tier", roleTier)
        .order("generated_at", { ascending: false })
        .limit(1);

      if (cached && cached.length > 0) {
        return new Response(JSON.stringify(cached[0]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Gather personal data filtered by user ownership
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    // All queries filtered by staff_user_id = user.id
    const [
      myAppointmentsRes,
      myRecentApptsRes,
      myTodayApptsRes,
    ] = await Promise.all([
      // My appointments last 30 days
      supabase
        .from("appointments")
        .select("appointment_date, status, duration_minutes, total_price, rebooked_at_checkout, start_time, end_time, service_name, client_name")
        .eq("staff_user_id", user.id)
        .gte("appointment_date", thirtyDaysAgo)
        .lte("appointment_date", today)
        .limit(500),

      // My upcoming appointments (next 7 days)
      supabase
        .from("appointments")
        .select("appointment_date, status, duration_minutes, total_price, start_time, end_time, service_name, client_name")
        .eq("staff_user_id", user.id)
        .gt("appointment_date", today)
        .lte("appointment_date", nextWeek)
        .limit(100),

      // Today's appointments
      supabase
        .from("appointments")
        .select("appointment_date, status, start_time, end_time, client_name, service_name, total_price, rebooked_at_checkout")
        .eq("staff_user_id", user.id)
        .eq("appointment_date", today)
        .order("start_time", { ascending: true })
        .limit(50),
    ]);

    const pastAppts = myAppointmentsRes.data || [];
    const upcomingAppts = myRecentApptsRes.data || [];
    const todayAppts = myTodayApptsRes.data || [];

    // Compute personal metrics
    const completed = pastAppts.filter((a) => a.status === "completed" || a.status === "checked_in" || a.status === "in_progress");
    const cancelled = pastAppts.filter((a) => a.status === "cancelled");
    const noShows = pastAppts.filter((a) => a.status === "no_show");
    const rebooked = completed.filter((a) => a.rebooked_at_checkout);
    const totalRevenue = completed.reduce((sum, a) => sum + (a.total_price || 0), 0);
    const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

    // Weekly breakdown for trends
    const thisWeekAppts = completed.filter((a) => a.appointment_date >= weekAgo);
    const thisWeekRevenue = thisWeekAppts.reduce((sum, a) => sum + (a.total_price || 0), 0);

    // Unique clients (for retention)
    const clientNames = new Set(completed.map((a) => a.client_name).filter(Boolean));

    // Build role-tier-specific data context
    let dataContext = `
PERSONAL DATA SNAPSHOT for ${profile.display_name || profile.full_name} (as of ${today}):
Role tier: ${roleTier}
Current roles: ${roles.join(", ")}

MY APPOINTMENTS (Last 30 days):
- Total appointments: ${pastAppts.length}
- Completed: ${completed.length}
- Cancelled: ${cancelled.length} (${pastAppts.length > 0 ? ((cancelled.length / pastAppts.length) * 100).toFixed(1) : 0}%)
- No-shows: ${noShows.length} (${pastAppts.length > 0 ? ((noShows.length / pastAppts.length) * 100).toFixed(1) : 0}%)
- Rebooked at checkout: ${rebooked.length} (${completed.length > 0 ? ((rebooked.length / completed.length) * 100).toFixed(1) : 0}%)
- Unique clients served: ${clientNames.size}

MY PERFORMANCE:
- Total revenue (30d): $${totalRevenue.toFixed(0)}
- This week revenue: $${thisWeekRevenue.toFixed(0)}
- This week completed: ${thisWeekAppts.length}
- Average ticket: $${avgTicket.toFixed(0)}

TODAY'S SCHEDULE:
${todayAppts.length > 0
  ? todayAppts.map((a) => `  ${a.start_time?.slice(11, 16) || "?"}-${a.end_time?.slice(11, 16) || "?"}: ${a.client_name || "Walk-in"} (${a.service_name || "Service"})`).join("\n")
  : "No appointments today"}

UPCOMING (Next 7 days):
- Booked appointments: ${upcomingAppts.length}
`;

    // Role-tier-specific additions
    if (roleTier === "front_desk") {
      // Front desk gets today's full queue info instead of personal revenue
      dataContext += `
FRONT DESK CONTEXT:
- Today's total appointments across salon: Check the queue for details
- Focus on check-in efficiency, rebooking at checkout, and no-show follow-up
`;
    }

    if (roleTier === "booth_renter") {
      dataContext += `
BOOTH RENTER CONTEXT:
- You operate independently. Focus on building your personal book and client retention.
- Track your own revenue trends and schedule utilization.
`;
    }

    // Build system prompt based on role tier
    const systemPrompts: Record<RoleTier, string> = {
      leadership: `You are ${AI_ASSISTANT_NAME}, a personal performance coach for salon leaders. Analyze this leader's personal performance data and provide insights about THEIR individual metrics. Even though they have access to org-wide data elsewhere, these insights focus on their personal behind-the-chair performance. Never reference data you were not given.`,
      stylist: `You are ${AI_ASSISTANT_NAME}, a personal performance coach for salon stylists. Analyze this stylist's performance data and provide actionable insights to help them grow their book, increase rebooking, and improve their average ticket. Never reference organizational revenue, other staff members' performance, or financial data you were not given. Focus only on what THIS stylist can control and improve.`,
      booth_renter: `You are ${AI_ASSISTANT_NAME}, a personal performance coach for independent booth renters. Analyze this booth renter's data and help them optimize their schedule, retain clients, and grow their independent business. Never reference organizational revenue or other staff members. Focus only on their personal book and revenue.`,
      front_desk: `You are ${AI_ASSISTANT_NAME}, a personal performance coach for front desk team members. Analyze this team member's data and provide insights about appointment flow, check-in efficiency, rebooking rates, and no-show patterns. Never reference organizational revenue, payroll, or staff performance comparisons. Focus on operational excellence at the front desk.`,
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `${systemPrompts[roleTier]}

${PERSONAL_ROUTE_MAP}

Generate 3-5 personal insights and 2-4 action items. Categories available: my_performance, my_clients, my_schedule, growth_tip, anomaly. Be encouraging but honest. Use specific numbers from the data. If data is limited, acknowledge it and suggest what to track.`,
          },
          {
            role: "user",
            content: `Analyze my personal performance data and give me personalized insights:\n\n${dataContext}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "deliver_personal_insights",
              description: "Return structured personal performance insights for a salon team member.",
              parameters: {
                type: "object",
                properties: {
                  summaryLine: {
                    type: "string",
                    description: "One-sentence personal performance summary. Encouraging but data-driven.",
                  },
                  overallSentiment: {
                    type: "string",
                    enum: ["positive", "neutral", "concerning"],
                    description: "Overall personal performance sentiment.",
                  },
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["my_performance", "my_clients", "my_schedule", "growth_tip", "anomaly"],
                        },
                        title: { type: "string", description: "Short title (5-8 words)" },
                        description: {
                          type: "string",
                          description: "Insight details (1-2 sentences, include specific numbers from the data)",
                        },
                        severity: {
                          type: "string",
                          enum: ["info", "warning", "critical"],
                        },
                      },
                      required: ["category", "title", "description", "severity"],
                      additionalProperties: false,
                    },
                  },
                  actionItems: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: {
                          type: "string",
                          description: "Specific action this team member can take today",
                        },
                        priority: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                        },
                      },
                      required: ["action", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["summaryLine", "overallSentiment", "insights", "actionItems"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "deliver_personal_insights" },
        },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate personal insights" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let insights;

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        insights = JSON.parse(toolCall.function.arguments);
      } else {
        throw new Error("No tool call in response");
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr, JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Failed to parse personal insights" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cache the result
    const expiresAt = new Date(Date.now() + CACHE_HOURS * 3600000).toISOString();
    const now = new Date().toISOString();

    // Delete old entries for this user
    await supabase
      .from("ai_personal_insights")
      .delete()
      .eq("user_id", user.id);

    const { data: saved, error: saveError } = await supabase
      .from("ai_personal_insights")
      .insert({
        user_id: user.id,
        organization_id: orgId,
        insights,
        role_tier: roleTier,
        generated_at: now,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to cache personal insights:", saveError);
    }

    return new Response(
      JSON.stringify(saved || { insights, generated_at: now, expires_at: expiresAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ai-personal-insights error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
