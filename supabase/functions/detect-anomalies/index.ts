import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { createNotification } from "../_shared/notify.ts";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody, ValidationError, z } from "../_shared/validation.ts";

const DetectAnomaliesSchema = z.object({
  organizationId: z.string().uuid(),
  organization_id: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

interface AnomalyResult {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  metricValue: number;
  expectedValue: number;
  deviationPercent: number;
  context: Record<string, unknown>;
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey) as any;

    const body = await validateBody(req, DetectAnomaliesSchema, getCorsHeaders(req));
    const { organizationId, locationId } = body;
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

    const anomalies: AnomalyResult[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 1. Check Revenue Drop
    const revenueAnomaly = await checkRevenueAnomaly(supabase, locationId, todayStr);
    if (revenueAnomaly) anomalies.push(revenueAnomaly);

    // 2. Check Cancellation Spike
    const cancellationAnomaly = await checkCancellationAnomaly(supabase, locationId, todayStr);
    if (cancellationAnomaly) anomalies.push(cancellationAnomaly);

    // 3. Check No-Show Surge
    const noShowAnomaly = await checkNoShowAnomaly(supabase, locationId, todayStr);
    if (noShowAnomaly) anomalies.push(noShowAnomaly);

    // 4. Check Booking Drop
    const bookingAnomaly = await checkBookingAnomaly(supabase, locationId, todayStr);
    if (bookingAnomaly) anomalies.push(bookingAnomaly);

    // Store detected anomalies
    if (anomalies.length > 0) {
      const anomaliesToInsert = anomalies.map((a: any) => ({
        organization_id: organizationId,
        location_id: locationId || null,
        anomaly_type: a.type,
        severity: a.severity,
        metric_value: a.metricValue,
        expected_value: a.expectedValue,
        deviation_percent: a.deviationPercent,
        context: a.context
      }));

      await supabase.from("detected_anomalies").insert(anomaliesToInsert);

      // Send push notifications for critical anomalies
      const criticalAnomalies = anomalies.filter((a: any) => a.severity === 'critical');
      if (criticalAnomalies.length > 0) {
        await sendAnomalyAlerts(supabase, organizationId, criticalAnomalies);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        detected: anomalies.length,
        anomalies,
        checkedAt: new Date().toISOString()
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Anomaly detection error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

async function checkRevenueAnomaly(
  supabase: any,
  locationId: string | undefined,
  today: string
): Promise<AnomalyResult | null> {
  // Get today's revenue from transaction items
  let todayQuery = supabase
    .from("phorest_transaction_items")
    .select("total_amount, tax_amount")
    .eq("transaction_date", today);

  if (locationId) todayQuery = todayQuery.eq("location_id", locationId);

  const { data: todayItems } = await todayQuery;
  const todayRevenue = (todayItems || []).reduce((s: number, r: any) => s + (Number(r.total_amount) || 0) + (Number(r.tax_amount) || 0), 0);

  // Get same day last week
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = lastWeek.toISOString().split('T')[0];

  let lastWeekQuery = supabase
    .from("phorest_transaction_items")
    .select("total_amount, tax_amount")
    .eq("transaction_date", lastWeekStr);

  if (locationId) lastWeekQuery = lastWeekQuery.eq("location_id", locationId);

  const { data: lastWeekItems } = await lastWeekQuery;
  const lastWeekRevenue = (lastWeekItems || []).reduce((s: number, r: any) => s + (Number(r.total_amount) || 0) + (Number(r.tax_amount) || 0), 0);

  if (lastWeekRevenue === 0) return null;

  const deviation = ((todayRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;

  // Alert if down more than 25%
  if (deviation < -25) {
    return {
      type: 'revenue_drop',
      severity: deviation < -50 ? 'critical' : 'warning',
      metricValue: todayRevenue,
      expectedValue: lastWeekRevenue,
      deviationPercent: Math.round(deviation),
      context: {
        comparison: 'same_day_last_week',
        todayDate: today,
        comparisonDate: lastWeekStr
      }
    };
  }

  return null;
}

async function checkCancellationAnomaly(
  supabase: any,
  locationId: string | undefined,
  today: string
): Promise<AnomalyResult | null> {
  // Get today's appointments
  let todayQuery = supabase
    .from("v_all_appointments")
    .select("id, status")
    .eq("appointment_date", today);

  if (locationId) todayQuery = todayQuery.eq("location_id", locationId);

  const { data: appointments } = await todayQuery;

  if (!appointments || appointments.length === 0) return null;

  const totalToday = appointments.length;
  const cancelledToday = appointments.filter(
    (a: any) => a.status === 'cancelled'
  ).length;

  const cancellationRate = (cancelledToday / totalToday) * 100;

  // Get average cancellation rate (last 30 days)
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let historyQuery = supabase
    .from("v_all_appointments")
    .select("id, status")
    .gte("appointment_date", thirtyDaysAgo.toISOString().split('T')[0])
    .lt("appointment_date", today);

  if (locationId) historyQuery = historyQuery.eq("location_id", locationId);

  const { data: historyAppts } = await historyQuery;

  if (!historyAppts || historyAppts.length < 50) return null;

  const historyCancelled = historyAppts.filter(
    (a: any) => a.status === 'cancelled'
  ).length;
  const avgCancellationRate = (historyCancelled / historyAppts.length) * 100;

  // Alert if cancellation rate is 2x the average
  if (cancellationRate > avgCancellationRate * 2 && cancelledToday >= 3) {
    return {
      type: 'cancellation_spike',
      severity: cancellationRate > avgCancellationRate * 3 ? 'critical' : 'warning',
      metricValue: cancellationRate,
      expectedValue: avgCancellationRate,
      deviationPercent: Math.round(((cancellationRate - avgCancellationRate) / avgCancellationRate) * 100),
      context: {
        cancelledToday,
        totalToday,
        avgRate: Math.round(avgCancellationRate * 10) / 10
      }
    };
  }

  return null;
}

async function checkNoShowAnomaly(
  supabase: any,
  locationId: string | undefined,
  today: string
): Promise<AnomalyResult | null> {
  let query = supabase
    .from("v_all_appointments")
    .select("id")
    .eq("appointment_date", today)
    .eq("status", "no_show");

  if (locationId) query = query.eq("location_id", locationId);

  const { data: noShows, count } = await query;

  const noShowCount = noShows?.length || 0;

  // Alert if more than 3 no-shows in a day
  if (noShowCount >= 3) {
    return {
      type: 'no_show_surge',
      severity: noShowCount >= 5 ? 'critical' : 'warning',
      metricValue: noShowCount,
      expectedValue: 1, // Typical expected
      deviationPercent: ((noShowCount - 1) / 1) * 100,
      context: {
        date: today,
        threshold: 3
      }
    };
  }

  return null;
}

async function checkBookingAnomaly(
  supabase: any,
  locationId: string | undefined,
  today: string
): Promise<AnomalyResult | null> {
  // Count bookings created today
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  let todayQuery = supabase
    .from("v_all_appointments")
    .select("id")
    .gte("created_at", todayStart.toISOString())
    .lte("created_at", todayEnd.toISOString());

  if (locationId) todayQuery = todayQuery.eq("location_id", locationId);

  const { data: todayBookings } = await todayQuery;
  const todayCount = todayBookings?.length || 0;

  // Get average daily bookings (last 14 days, same day of week)
  const dayOfWeek = new Date(today).getDay();
  const sameDayDates: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (i * 7));
    sameDayDates.push(d.toISOString().split('T')[0]);
  }

  let avgCount = 0;
  for (const date of sameDayDates) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    let q = supabase
      .from("v_all_appointments")
      .select("id")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (locationId) q = q.eq("location_id", locationId);

    const { data } = await q;
    avgCount += data?.length || 0;
  }

  const avgDaily = sameDayDates.length > 0 ? avgCount / sameDayDates.length : 0;

  if (avgDaily === 0) return null;

  const deviation = ((todayCount - avgDaily) / avgDaily) * 100;

  // Alert if bookings are down more than 40%
  if (deviation < -40 && avgDaily >= 5) {
    return {
      type: 'booking_drop',
      severity: deviation < -60 ? 'critical' : 'warning',
      metricValue: todayCount,
      expectedValue: Math.round(avgDaily),
      deviationPercent: Math.round(deviation),
      context: {
        dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
        comparedAgainst: `${sameDayDates.length} previous ${['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][dayOfWeek]}`
      }
    };
  }

  return null;
}

async function sendAnomalyAlerts(
  supabase: any,
  organizationId: string,
  anomalies: AnomalyResult[]
) {
  // Get admin users for the organization
  const { data: admins } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "manager", "super_admin"]);

  if (!admins || admins.length === 0) return;

  // Create platform notifications
  for (const anomaly of anomalies) {
    const title = getAnomalyTitle(anomaly);
    const message = getAnomalyMessage(anomaly);

    await createNotification(supabase, {
      type: 'anomaly_detected',
      title,
      message,
      severity: anomaly.severity,
      metadata: { anomaly },
    }, { cooldownMinutes: 120 });
  }
}

function getAnomalyTitle(anomaly: AnomalyResult): string {
  switch (anomaly.type) {
    case 'revenue_drop':
      return '⚠️ Revenue Drop Detected';
    case 'cancellation_spike':
      return '🚨 Cancellation Spike';
    case 'no_show_surge':
      return '⚠️ No-Show Surge';
    case 'booking_drop':
      return '📉 Booking Drop';
    default:
      return '⚠️ Anomaly Detected';
  }
}

function getAnomalyMessage(anomaly: AnomalyResult): string {
  switch (anomaly.type) {
    case 'revenue_drop':
      return `Today's revenue is ${Math.abs(anomaly.deviationPercent)}% below expected ($${anomaly.metricValue} vs $${anomaly.expectedValue})`;
    case 'cancellation_spike':
      return `Cancellation rate is ${Math.round(anomaly.metricValue)}% today (normal: ${Math.round(anomaly.expectedValue)}%)`;
    case 'no_show_surge':
      return `${anomaly.metricValue} no-shows today - above normal threshold`;
    case 'booking_drop':
      return `New bookings are ${Math.abs(anomaly.deviationPercent)}% below average (${anomaly.metricValue} vs ${anomaly.expectedValue})`;
    default:
      return `Unusual activity detected: ${anomaly.deviationPercent}% deviation`;
  }
}
