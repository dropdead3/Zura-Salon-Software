import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody, ValidationError, z } from "../_shared/validation.ts";

const SchedulingCopilotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  locationId: z.string().uuid().optional(),
  serviceDurationMinutes: z.number().int().min(5).max(480).optional().default(60),
  staffUserId: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  organization_id: z.string().uuid().optional(),
});

interface ScheduleSlot {
  time: string;
  endTime: string;
  staffUserId: string;
  staffName: string;
  score: number;
  reason: string;
  suggestionType: 'optimal_slot' | 'fill_gap' | 'avoid_conflict' | 'peak_time';
}

interface ExistingAppointment {
  id: string;
  start_time: string;
  end_time: string;
  client_name: string | null;
  staff_user_id: string;
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
    } catch (authErr: any) {
      return authErrorResponse(authErr, getCorsHeaders(req));
    }
    const { user, supabaseAdmin } = authResult;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const body = await validateBody(req, SchedulingCopilotSchema, getCorsHeaders(req));
    const { 
      date, 
      locationId, 
      serviceDurationMinutes, 
      staffUserId,
      organizationId 
    } = body;
    // Verify org access
    try {
      const orgId = body.organizationId || body.organization_id;
      if (!orgId) {
        return authErrorResponse({ status: 400, message: "organizationId is required" }, getCorsHeaders(req));
      }
      await requireOrgMember(supabaseAdmin, user.id, orgId);
    } catch (orgErr: any) {
      return authErrorResponse(orgErr, getCorsHeaders(req));
    }


    if (!date || !organizationId) {
      return new Response(
        JSON.stringify({ error: "date and organizationId are required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Fetch existing appointments for the date
    let appointmentsQuery = supabase
      .from("phorest_appointments")
      .select("id, start_time, end_time, client_name, phorest_staff_id")
      .eq("appointment_date", date)
      .not("status", "in", '("cancelled","no_show")')
      .order("start_time", { ascending: true });

    if (locationId && locationId !== "all") {
      appointmentsQuery = appointmentsQuery.eq("location_id", locationId);
    }

    const { data: appointments, error: apptError } = await appointmentsQuery;

    if (apptError) {
      console.error("Error fetching appointments:", apptError);
      throw new Error("Failed to fetch appointments");
    }

    // Fetch staff mappings to get user IDs and names
    const staffIds = [...new Set((appointments || []).map((a: any) => a.phorest_staff_id).filter(Boolean))];
    
    let staffMap: Record<string, { userId: string; name: string }> = {};
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase
        .from("phorest_staff_mapping")
        .select("phorest_staff_id, user_id, phorest_staff_name")
        .in("phorest_staff_id", staffIds);

      if (staffData) {
        staffData.forEach((s: any) => {
          if (s.phorest_staff_id && s.user_id) {
            staffMap[s.phorest_staff_id] = {
              userId: s.user_id,
              name: s.phorest_staff_name || ''
            };
          }
        });
      }
    }

    // Fetch available staff for the location
    let staffQuery = supabase
      .from("employee_profiles")
      .select("user_id, display_name, first_name, last_name")
      .eq("organization_id", organizationId)
      .eq("is_approved", true)
      .eq("employment_status", "active");

    if (staffUserId) {
      staffQuery = staffQuery.eq("user_id", staffUserId);
    }

    const { data: availableStaff } = await staffQuery;

    // Fetch booking patterns for the day of week
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    const { data: patterns } = await supabase
      .from("booking_patterns")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("day_of_week", dayOfWeek);

    // Transform appointments with staff info
    const enrichedAppointments: ExistingAppointment[] = (appointments || []).map((apt: any) => ({
      id: apt.id,
      start_time: apt.start_time,
      end_time: apt.end_time,
      client_name: apt.client_name,
      staff_user_id: staffMap[apt.phorest_staff_id]?.userId || apt.phorest_staff_id
    }));

    // Build schedule context for AI
    const scheduleContext = {
      date,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
      serviceDuration: serviceDurationMinutes,
      existingAppointments: enrichedAppointments.map((apt: any) => ({
        startTime: apt.start_time,
        endTime: apt.end_time,
        clientName: apt.client_name || 'Client'
      })),
      availableStaff: (availableStaff || []).map((s: any) => ({
        id: s.user_id,
        name: s.display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim()
      })),
      peakHours: (patterns || [])
        .filter((p: any) => p.peak_score && p.peak_score > 0.7)
        .map((p: any) => p.hour_of_day),
      businessHours: { start: 9, end: 20 }
    };

    // Call Lovable AI for intelligent scheduling suggestions
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an intelligent scheduling assistant for a salon. Your job is to analyze the current schedule and suggest optimal appointment times.

Consider these factors when making suggestions:
1. Gap filling - Find gaps in the schedule that could be filled to improve efficiency
2. Peak time alignment - Prefer times during busy periods for better revenue
3. Buffer time - Avoid back-to-back appointments when possible (5-10 min buffer)
4. Staff utilization - Balance workload across available staff
5. Practical times - Avoid very early or very late slots unless necessary

Return your suggestions as a JSON array with this structure:
{
  "suggestions": [
    {
      "time": "HH:MM",
      "endTime": "HH:MM",
      "staffId": "uuid",
      "staffName": "Name",
      "score": 0.0-1.0,
      "reason": "Brief explanation",
      "type": "optimal_slot|fill_gap|avoid_conflict|peak_time"
    }
  ]
}

Provide 3-5 suggestions, sorted by score (highest first).`
          },
          {
            role: "user",
            content: `Analyze this schedule and suggest optimal times for a ${serviceDurationMinutes}-minute appointment:

${JSON.stringify(scheduleContext, null, 2)}

Return ONLY the JSON response, no markdown or explanation.`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please contact support." }),
          { status: 402, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI service temporarily unavailable");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    // Parse AI response
    let suggestions: ScheduleSlot[] = [];
    try {
      // Clean up the response if it has markdown code blocks
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      
      const parsed = JSON.parse(cleanContent.trim());
      suggestions = parsed.suggestions || [];
    } catch (parseError: any) {
      console.error("Failed to parse AI response:", parseError, content);
      // Return fallback suggestions based on simple gap analysis
      suggestions = generateFallbackSuggestions(
        enrichedAppointments,
        availableStaff || [],
        serviceDurationMinutes
      );
    }

    // Store suggestions in database for analytics
    if (suggestions.length > 0) {
      const suggestionsToInsert = suggestions.slice(0, 5).map((s: any) => ({
        organization_id: organizationId,
        staff_user_id: s.staffUserId || (availableStaff?.[0]?.user_id),
        suggested_date: date,
        suggested_time: s.time,
        suggestion_type: s.suggestionType || 'optimal_slot',
        confidence_score: s.score,
        context: { reason: s.reason, endTime: s.endTime },
        service_duration_minutes: serviceDurationMinutes,
        location_id: locationId
      }));

      await supabase
        .from("scheduling_suggestions")
        .insert(suggestionsToInsert);
    }

    return new Response(
      JSON.stringify({
        success: true,
        date,
        serviceDuration: serviceDurationMinutes,
        suggestions: suggestions.slice(0, 5),
        existingCount: enrichedAppointments.length
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Scheduling copilot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

// Fallback suggestion generator when AI is unavailable
function generateFallbackSuggestions(
  appointments: ExistingAppointment[],
  staff: any[],
  duration: number
): ScheduleSlot[] {
  const suggestions: ScheduleSlot[] = [];
  const businessStart = 9 * 60; // 9 AM in minutes
  const businessEnd = 20 * 60; // 8 PM in minutes

  // Find gaps in schedule
  const sortedApts = [...appointments].sort((a: any, b: any) => 
    a.start_time.localeCompare(b.start_time)
  );

  // Check morning slot
  if (sortedApts.length === 0 || timeToMinutes(sortedApts[0].start_time) >= businessStart + duration) {
    const staffMember = staff[0];
    if (staffMember) {
      suggestions.push({
        time: "09:00",
        endTime: minutesToTime(businessStart + duration),
        staffUserId: staffMember.user_id,
        staffName: staffMember.display_name || `${staffMember.first_name || ''} ${staffMember.last_name || ''}`.trim(),
        score: 0.75,
        reason: "Morning slot available",
        suggestionType: "optimal_slot"
      });
    }
  }

  // Find gaps between appointments
  for (let i = 0; i < sortedApts.length - 1; i++) {
    const current = sortedApts[i];
    const next = sortedApts[i + 1];
    const gapStart = timeToMinutes(current.end_time);
    const gapEnd = timeToMinutes(next.start_time);
    const gap = gapEnd - gapStart;

    if (gap >= duration + 10) { // Gap big enough for appointment + buffer
      const staffMember = staff[0];
      if (staffMember) {
        suggestions.push({
          time: minutesToTime(gapStart + 5),
          endTime: minutesToTime(gapStart + 5 + duration),
          staffUserId: staffMember.user_id,
          staffName: staffMember.display_name || `${staffMember.first_name || ''} ${staffMember.last_name || ''}`.trim(),
          score: 0.85,
          reason: `Fills ${gap}-minute gap efficiently`,
          suggestionType: "fill_gap"
        });
      }
    }
  }

  return suggestions.slice(0, 5);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
