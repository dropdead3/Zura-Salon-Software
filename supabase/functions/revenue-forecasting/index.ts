import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DailyForecast {
  date: string;
  predictedRevenue: number;
  predictedServices: number;
  predictedProducts: number;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const useAi = !!lovableApiKey;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      organizationId,
      locationId,
      forecastDays = 7,
      forecastType = 'daily'
    } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get historical sales data (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    let salesQuery = supabase
      .from("phorest_daily_sales_summary")
      .select("*")
      .gte("summary_date", ninetyDaysAgo.toISOString().split('T')[0])
      .order("summary_date", { ascending: true });

    if (locationId && locationId !== "all") {
      salesQuery = salesQuery.eq("location_id", locationId);
    }

    const { data: historicalSales, error: salesError } = await salesQuery;

    if (salesError) {
      console.error("Error fetching sales:", salesError);
      throw new Error("Failed to fetch historical sales");
    }

    // ── 30-Day Gap Ratio Calculation ──
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Fetch scheduled appointment totals per day (last 30 days, all statuses)
    let scheduledQuery = supabase
      .from("phorest_appointments")
      .select("appointment_date, total_price")
      .gte("appointment_date", thirtyDaysAgoStr)
      .lte("appointment_date", yesterdayStr);

    if (locationId && locationId !== "all") {
      scheduledQuery = scheduledQuery.eq("location_id", locationId);
    }

    const { data: scheduledAppointments, error: schedError } = await scheduledQuery;
    if (schedError) {
      console.error("Error fetching scheduled appointments for gap calc:", schedError);
    }

    // Build scheduled totals by date
    const scheduledByDate: Record<string, number> = {};
    (scheduledAppointments || []).forEach(apt => {
      const d = apt.appointment_date;
      if (!scheduledByDate[d]) scheduledByDate[d] = 0;
      scheduledByDate[d] += Number(apt.total_price) || 0;
    });

    // Build actual totals by date from historical sales (already fetched, filter to 30-day window)
    const actualByDate: Record<string, number> = {};
    (historicalSales || []).forEach(day => {
      if (day.summary_date >= thirtyDaysAgoStr && day.summary_date <= yesterdayStr) {
        if (!actualByDate[day.summary_date]) actualByDate[day.summary_date] = 0;
        actualByDate[day.summary_date] += Number(day.total_revenue) || 0;
      }
    });

    // Compute daily realization ratios
    const ratios: number[] = [];
    for (const date of Object.keys(scheduledByDate)) {
      const scheduled = scheduledByDate[date];
      const actual = actualByDate[date];
      if (scheduled > 0 && actual !== undefined) {
        ratios.push(actual / scheduled);
      }
    }

    // Calculate gap adjustment factor, clamped [0.70, 1.00]
    let gapAdjustmentFactor = 1.0;
    if (ratios.length >= 3) {
      const avgRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length;
      gapAdjustmentFactor = Math.min(1.0, Math.max(0.70, avgRatio));
    }

    const realizationDataPoints = ratios.length;
    console.log(`Gap adjustment: factor=${gapAdjustmentFactor.toFixed(3)}, dataPoints=${realizationDataPoints}`);

    // Get upcoming booked appointments
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + forecastDays);

    let appointmentsQuery = supabase
      .from("phorest_appointments")
      .select("appointment_date, total_price, status")
      .gte("appointment_date", today.toISOString().split('T')[0])
      .lte("appointment_date", endDate.toISOString().split('T')[0])
      .not("status", "in", '("cancelled","no_show")');

    if (locationId && locationId !== "all") {
      appointmentsQuery = appointmentsQuery.eq("location_id", locationId);
    }

    const { data: upcomingAppointments, error: apptError } = await appointmentsQuery;

    if (apptError) {
      console.error("Error fetching appointments:", apptError);
    }

    // Aggregate historical data by day of week
    const dayOfWeekAverages: Record<number, { total: number; count: number; services: number; products: number }> = {};
    (historicalSales || []).forEach(day => {
      const date = new Date(day.summary_date);
      const dow = date.getDay();
      if (!dayOfWeekAverages[dow]) {
        dayOfWeekAverages[dow] = { total: 0, count: 0, services: 0, products: 0 };
      }
      dayOfWeekAverages[dow].total += Number(day.total_revenue) || 0;
      dayOfWeekAverages[dow].services += Number(day.service_revenue) || 0;
      dayOfWeekAverages[dow].products += Number(day.product_revenue) || 0;
      dayOfWeekAverages[dow].count += 1;
    });

    // Calculate booked revenue per day
    const bookedByDate: Record<string, number> = {};
    (upcomingAppointments || []).forEach(apt => {
      const date = apt.appointment_date;
      if (!bookedByDate[date]) bookedByDate[date] = 0;
      bookedByDate[date] += Number(apt.total_price) || 0;
    });

    const trend = calculateTrend(historicalSales || []);

    let forecasts: DailyForecast[] = [];
    let summary: { totalPredicted: number; avgDaily: number; trend: 'up' | 'down' | 'stable'; peakDay?: string; keyInsight: string } | null = null;

    if (useAi) {
      // Build context for AI (now includes gap adjustment data)
      const forecastContext = {
        historicalDays: historicalSales?.length || 0,
        dayOfWeekAverages: Object.entries(dayOfWeekAverages).map(([dow, data]) => ({
          dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][Number(dow)],
          avgRevenue: data.count > 0 ? Math.round(data.total / data.count) : 0,
          avgServices: data.count > 0 ? Math.round(data.services / data.count) : 0,
          avgProducts: data.count > 0 ? Math.round(data.products / data.count) : 0,
          sampleSize: data.count
        })),
        bookedRevenue: Object.entries(bookedByDate).map(([date, amount]) => ({
          date,
          bookedAmount: Math.round(amount),
          adjustedAmount: Math.round(amount * gapAdjustmentFactor)
        })),
        recentTrend: trend,
        forecastDays,
        startDate: today.toISOString().split('T')[0],
        gapAdjustment: {
          realizationRate: Math.round(gapAdjustmentFactor * 100),
          factor: Number(gapAdjustmentFactor.toFixed(3)),
          dataPoints: realizationDataPoints,
          explanation: `Over the last 30 days, ${Math.round(gapAdjustmentFactor * 100)}% of scheduled revenue was actually collected (based on ${realizationDataPoints} days of data). Apply this realization rate to booked revenue for more accurate predictions.`
        }
      };

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
              content: `You are a revenue forecasting AI for a salon business. Analyze historical patterns and predict future revenue.

Consider these factors:
1. Day-of-week patterns (weekends typically busier)
2. Already booked appointments (guaranteed revenue) — BUT apply the realization rate to booked amounts, as historically only a percentage of scheduled revenue converts to actual collected revenue (due to cancellations, no-shows, discounts, pricing differences)
3. Historical averages for each day
4. Recent trends (growth or decline)
5. Seasonal factors
6. The gap adjustment / realization rate provided in the data — this is critical for calibrating booked revenue predictions

Return a JSON object with this exact structure:
{
  "forecasts": [
    {
      "date": "YYYY-MM-DD",
      "predictedRevenue": number,
      "predictedServices": number,
      "predictedProducts": number,
      "confidence": "high" | "medium" | "low",
      "factors": ["factor1", "factor2"]
    }
  ],
  "summary": {
    "totalPredicted": number,
    "avgDaily": number,
    "trend": "up" | "down" | "stable",
    "peakDay": "YYYY-MM-DD",
    "keyInsight": "Brief insight about the forecast"
  }
}

Confidence levels:
- high: Strong historical patterns + significant booked revenue
- medium: Moderate patterns with some variability
- low: Limited data or high uncertainty`
            },
            {
              role: "user",
              content: `Generate a ${forecastDays}-day revenue forecast based on this data:

${JSON.stringify(forecastContext, null, 2)}

Return ONLY valid JSON, no markdown or explanation.`
            }
          ],
          temperature: 0.2,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResponse.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI usage limit reached. Please contact support." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error("AI service temporarily unavailable");
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "{}";

      try {
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
        if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
        if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
        
        const parsed = JSON.parse(cleanContent.trim());
        forecasts = parsed.forecasts || [];
        summary = parsed.summary;
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError, content);
        forecasts = generateFallbackForecasts(forecastDays, dayOfWeekAverages, bookedByDate, today, trend, gapAdjustmentFactor);
      }
    } else {
      forecasts = generateFallbackForecasts(forecastDays, dayOfWeekAverages, bookedByDate, today, trend, gapAdjustmentFactor);
      const totalPredicted = forecasts.reduce((sum, f) => sum + f.predictedRevenue, 0);
      summary = {
        totalPredicted,
        avgDaily: forecasts.length > 0 ? Math.round(totalPredicted / forecasts.length) : 0,
        trend,
        keyInsight: historicalSales?.length
          ? `Based on ${historicalSales.length} days of history and day-of-week patterns${gapAdjustmentFactor < 1 ? `, adjusted for ${Math.round(gapAdjustmentFactor * 100)}% realization rate` : ''}`
          : "Based on current bookings (add more history for trend-based predictions)"
      };
    }

    // Store forecasts in database
    if (forecasts.length > 0) {
      const forecastsToUpsert = forecasts.map(f => ({
        organization_id: organizationId,
        location_id: locationId || null,
        forecast_date: f.date,
        forecast_type: forecastType,
        predicted_revenue: f.predictedRevenue,
        predicted_services: f.predictedServices,
        predicted_products: f.predictedProducts,
        confidence_level: f.confidence,
        factors: f.factors
      }));

      await supabase
        .from("revenue_forecasts")
        .upsert(forecastsToUpsert, { 
          onConflict: 'organization_id,location_id,forecast_date,forecast_type' 
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        forecasts,
        summary: summary || {
          totalPredicted: forecasts.reduce((sum, f) => sum + f.predictedRevenue, 0),
          avgDaily: forecasts.length ? Math.round(forecasts.reduce((sum, f) => sum + f.predictedRevenue, 0) / forecasts.length) : 0,
          trend,
          keyInsight: `Based on ${historicalSales?.length || 0} days of historical data`
        },
        historicalDataPoints: historicalSales?.length || 0,
        gapAdjustmentFactor: Number(gapAdjustmentFactor.toFixed(3)),
        realizationRate: Math.round(gapAdjustmentFactor * 100),
        realizationDataPoints,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Revenue forecasting error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateTrend(sales: any[]): 'up' | 'down' | 'stable' {
  if (sales.length < 14) return 'stable';
  
  const recent = sales.slice(-7);
  const previous = sales.slice(-14, -7);
  
  const recentAvg = recent.reduce((sum, d) => sum + (Number(d.total_revenue) || 0), 0) / 7;
  const previousAvg = previous.reduce((sum, d) => sum + (Number(d.total_revenue) || 0), 0) / 7;
  
  const change = ((recentAvg - previousAvg) / previousAvg) * 100;
  
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
}

const TREND_MULTIPLIER = { up: 1.05, down: 0.95, stable: 1 };

function generateFallbackForecasts(
  days: number,
  dayOfWeekAvg: Record<number, { total: number; count: number; services: number; products: number }>,
  bookedByDate: Record<string, number>,
  startDate: Date,
  trend: 'up' | 'down' | 'stable' = 'stable',
  gapFactor: number = 1.0
): DailyForecast[] {
  const forecasts: DailyForecast[] = [];
  const mult = TREND_MULTIPLIER[trend];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const dow = date.getDay();

    const avgData = dayOfWeekAvg[dow];
    const rawBase = avgData && avgData.count > 0
      ? avgData.total / avgData.count
      : 0;
    const baseRevenue = Math.round(rawBase * mult);
    const rawBooked = bookedByDate[dateStr] || 0;
    const adjustedBooked = Math.round(rawBooked * gapFactor);

    const predicted = Math.max(adjustedBooked, baseRevenue);

    const factors: string[] = [];
    if (rawBooked > 0) {
      factors.push(`$${Math.round(rawBooked)} booked`);
      if (gapFactor < 1) {
        factors.push(`Adjusted to $${adjustedBooked} (${Math.round(gapFactor * 100)}% realization)`);
      }
    } else {
      factors.push('Based on historical average');
    }

    forecasts.push({
      date: dateStr,
      predictedRevenue: predicted,
      predictedServices: avgData && avgData.count > 0
        ? Math.round(avgData.services / avgData.count)
        : 0,
      predictedProducts: avgData && avgData.count > 0
        ? Math.round(avgData.products / avgData.count)
        : 0,
      confidence: rawBooked > 0 ? 'high' : (avgData && avgData.count >= 10 ? 'medium' : 'low'),
      factors
    });
  }

  return forecasts;
}
