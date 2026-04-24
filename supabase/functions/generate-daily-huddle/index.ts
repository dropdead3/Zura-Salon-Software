import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { AI_ASSISTANT_NAME_DEFAULT as AI_ASSISTANT_NAME } from "../_shared/brand.ts";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody, ValidationError, z } from "../_shared/validation.ts";

const HuddleSchema = z.object({
  organizationId: z.string().uuid(),
  organization_id: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  huddleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

interface HuddleContent {
  focus_of_the_day: string;
  wins_from_yesterday: string;
  announcements: string;
  birthdays_celebrations: string;
  training_reminders: string;
  sales_goals: { retail: number; service: number };
}

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const body = await validateBody(req, HuddleSchema, getCorsHeaders(req));
    // Verify org access
    try {
      const orgId = body.organizationId || body.organization_id;
      if (!orgId) {
        return authErrorResponse({ status: 400, message: "organizationId is required" }, getCorsHeaders(req));
      }
      await requireOrgMember(supabaseAdmin, user.id, orgId);
    } catch (orgErr) {
      return authErrorResponse(orgErr, getCorsHeaders(req));
    }

    const { organizationId, locationId, huddleDate } = body;

    if (!organizationId || !huddleDate) {
      return new Response(
        JSON.stringify({ error: "organizationId and huddleDate are required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Calculate yesterday's date
    const today = new Date(huddleDate);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // Gather data for AI context
    const contextData: Record<string, unknown> = {};

    // 1. Yesterday's sales from transaction items
    const { data: yesterdayTxnItems } = await supabase
      .from("phorest_transaction_items")
      .select("total_amount, tax_amount, item_type")
      .eq("organization_id", organizationId)
      .eq("transaction_date", yesterdayStr);

    const yesterdaySales = { total_revenue: 0, service_revenue: 0, product_revenue: 0 };
    (yesterdayTxnItems || []).forEach((item: any) => {
      const rev = (Number(item.total_amount) || 0) + (Number(item.tax_amount) || 0);
      yesterdaySales.total_revenue += rev;
      if (item.item_type === "service") yesterdaySales.service_revenue += rev;
      else yesterdaySales.product_revenue += rev;
    });

    contextData.yesterdaySales = yesterdaySales;

    // 2. Yesterday's appointments stats
    const { data: yesterdayAppts, count: totalAppts } = await supabase
      .from("appointments")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("appointment_date", yesterdayStr);

    const noShows = yesterdayAppts?.filter((a) => a.status === "no_show").length || 0;
    const cancellations = yesterdayAppts?.filter((a) => a.status === "cancelled").length || 0;
    contextData.yesterdayOperations = {
      totalAppointments: totalAppts || 0,
      noShows,
      cancellations,
      completed: (totalAppts || 0) - noShows - cancellations,
    };

    // 3. Today's schedule
    const { count: todayApptCount } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("appointment_date", huddleDate)
      .neq("status", "cancelled");

    contextData.todaySchedule = { appointmentsBooked: todayApptCount || 0 };

    // 4. Today's birthdays/anniversaries
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    const { data: birthdays } = await supabase
      .from("employee_profiles")
      .select("full_name, display_name, birth_date, hire_date")
      .eq("organization_id", organizationId)
      .eq("is_approved", true);

    const todayBirthdays = birthdays?.filter((e) => {
      if (!e.birth_date) return false;
      const bd = new Date(e.birth_date);
      return bd.getMonth() + 1 === todayMonth && bd.getDate() === todayDay;
    }) || [];

    const todayAnniversaries = birthdays?.filter((e) => {
      if (!e.hire_date) return false;
      const hd = new Date(e.hire_date);
      return hd.getMonth() + 1 === todayMonth && hd.getDate() === todayDay;
    }) || [];

    contextData.celebrations = {
      birthdays: todayBirthdays.map((e) => e.display_name || e.full_name),
      anniversaries: todayAnniversaries.map((e) => ({
        name: e.display_name || e.full_name,
        years: today.getFullYear() - new Date(e.hire_date!).getFullYear(),
      })),
    };

    // 5. Active anomalies
    const { data: anomalies } = await supabase
      .from("detected_anomalies")
      .select("anomaly_type, description, severity")
      .eq("organization_id", organizationId)
      .is("acknowledged_at", null)
      .order("detected_at", { ascending: false })
      .limit(3);

    contextData.activeAlerts = anomalies || [];

    // Build AI prompt
    const prompt = `You are ${AI_ASSISTANT_NAME}, a salon manager's AI assistant. Generate an engaging, motivational daily huddle for a salon team.

Today's Date: ${huddleDate}
Yesterday's Date: ${yesterdayStr}

DATA CONTEXT:
${JSON.stringify(contextData, null, 2)}

Generate content for each section. Be specific with numbers when available. Keep it motivational and actionable.

Respond with ONLY valid JSON in this exact format:
{
  "focus_of_the_day": "One clear, actionable focus for the team today (1-2 sentences)",
  "wins_from_yesterday": "Bullet points celebrating yesterday's achievements. Include specific numbers.",
  "announcements": "Any important reminders or updates based on the data",
  "birthdays_celebrations": "Birthday wishes and work anniversary celebrations if any",
  "training_reminders": "Brief training or development reminder if relevant",
  "sales_goals": { "retail": 500, "service": 2000 }
}

If there are no birthdays/celebrations, set that field to an empty string.
Estimate reasonable sales goals based on the yesterday's data.`;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a helpful salon management assistant. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let huddleContent: HuddleContent;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || 
                        aiContent.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      huddleContent = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: aiContent }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        content: huddleContent,
        ai_generated: true,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating huddle:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
