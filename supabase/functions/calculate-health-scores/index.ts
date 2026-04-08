import { createClient } from "@supabase/supabase-js";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { z } from "../_shared/validation.ts";

const HealthScoreSchema = z.object({
  organizationId: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
});

interface HealthBreakdown {
  adoption: {
    score: number;
    factors: {
      active_users: number;
      total_users: number;
      login_frequency: number;
      features_used: number;
    };
  };
  engagement: {
    score: number;
    factors: {
      chat_messages_7d: number;
      announcements_count: number;
      tasks_completed: number;
    };
  };
  performance: {
    score: number;
    factors: {
      revenue_current: number;
      revenue_previous: number;
      revenue_trend: number;
      booking_count: number;
      avg_ticket: number;
    };
  };
  data_quality: {
    score: number;
    factors: {
      sync_success_rate: number;
      hours_since_sync: number;
      anomalies_unresolved: number;
    };
  };
}

interface OrganizationScore {
  organization_id: string;
  organization_name: string;
  score: number;
  risk_level: "healthy" | "at_risk" | "critical";
  score_breakdown: HealthBreakdown;
  trends: {
    score_7d_ago: number | null;
    score_30d_ago: number | null;
    trend: "improving" | "stable" | "declining";
  };
  recommendations: string[];
}

Deno.serve(async (req) => {
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body for optional org filter
    let targetOrgId: string | null = null;
    try {
      const raw = await req.json();
      const parsed = HealthScoreSchema.safeParse(raw);
      if (parsed.success) {
        const body = parsed.data;
        // Verify org access if org specified
        if (body.organizationId || body.organization_id) {
          try {
            await requireOrgMember(supabaseAdmin, user.id, (body.organizationId || body.organization_id)!);
          } catch (orgErr) {
            return authErrorResponse(orgErr, getCorsHeaders(req));
          }
        }
        targetOrgId = body.organizationId || body.organization_id || null;
      }
    } catch {
      // No body, process all orgs
    }

    // Fetch all active organizations
    let orgsQuery = supabase
      .from("organizations")
      .select("id, name, status")
      .eq("status", "active");

    if (targetOrgId) {
      orgsQuery = orgsQuery.eq("id", targetOrgId);
    }

    const { data: organizations, error: orgsError } = await orgsQuery;

    if (orgsError) {
      throw new Error(`Failed to fetch organizations: ${orgsError.message}`);
    }

    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const scores: OrganizationScore[] = [];

    for (const org of organizations || []) {
      try {
        // 1. ADOPTION SCORE
        const { count: totalUsers } = await supabase
          .from("employee_profiles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .eq("is_active", true);

        const { count: activeUsers } = await supabase
          .from("platform_audit_log")
          .select("user_id", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .gte("created_at", sevenDaysAgo);

        // Count distinct actions as feature usage proxy
        const { data: actionsData } = await supabase
          .from("platform_audit_log")
          .select("action")
          .eq("organization_id", org.id)
          .gte("created_at", sevenDaysAgo);

        const uniqueActions = new Set(actionsData?.map((a) => a.action) || []);
        const featuresUsed = uniqueActions.size;

        const activeUsersCount = activeUsers || 0;
        const totalUsersCount = totalUsers || 1;
        const activeRatio = Math.min(activeUsersCount / totalUsersCount, 1);
        const loginFrequency = totalUsersCount > 0 
          ? (activeUsersCount / totalUsersCount) * 7 
          : 0;

        const adoptionScore = Math.round(
          activeRatio * 40 +
          Math.min(loginFrequency / 5, 1) * 30 +
          Math.min(featuresUsed / 10, 1) * 30
        );

        // 2. ENGAGEMENT SCORE
        const { count: chatMessages } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo);

        const { count: announcements } = await supabase
          .from("announcements")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo);

        const chatCount = chatMessages || 0;
        const announcementsCount = announcements || 0;

        const engagementScore = Math.round(
          Math.min(chatCount / 50, 1) * 50 +
          Math.min(announcementsCount / 5, 1) * 30 +
          20 // Base score for tasks (simplified)
        );

        // 3. PERFORMANCE SCORE (from transaction items)
        const { data: salesCurrentItems } = await supabase
          .from("phorest_transaction_items")
          .select("total_amount, tax_amount")
          .eq("organization_id", org.id)
          .gte("transaction_date", sevenDaysAgo)
          .lte("transaction_date", today);

        const { data: salesPreviousItems } = await supabase
          .from("phorest_transaction_items")
          .select("total_amount, tax_amount")
          .eq("organization_id", org.id)
          .gte("transaction_date", fourteenDaysAgo)
          .lt("transaction_date", sevenDaysAgo);

        const currentRevenue =
          (salesCurrentItems || []).reduce((sum, s) => sum + (Number(s.total_amount) || 0) + (Number(s.tax_amount) || 0), 0);
        const previousRevenue =
          (salesPreviousItems || []).reduce((sum, s) => sum + (Number(s.total_amount) || 0) + (Number(s.tax_amount) || 0), 0) || 1;
        const revenueTrend = previousRevenue > 0 
          ? currentRevenue / previousRevenue 
          : 1;

        const { count: bookingCount } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .gte("appointment_date", sevenDaysAgo);

        const avgTicket = bookingCount && bookingCount > 0 
          ? currentRevenue / bookingCount 
          : 0;

        const performanceScore = Math.round(
          Math.min(revenueTrend, 1.2) / 1.2 * 40 +
          Math.min((bookingCount || 0) / 100, 1) * 30 +
          Math.min(avgTicket / 150, 1) * 30
        );

        // 4. DATA QUALITY SCORE
        const { data: syncLogs } = await supabase
          .from("phorest_sync_log")
          .select("status, completed_at")
          .eq("organization_id", org.id)
          .order("completed_at", { ascending: false })
          .limit(20);

        const successfulSyncs = syncLogs?.filter((s) => s.status === "completed").length || 0;
        const totalSyncs = syncLogs?.length || 1;
        const syncSuccessRate = successfulSyncs / totalSyncs;

        const lastSync = syncLogs?.[0]?.completed_at;
        const hoursSinceSync = lastSync
          ? (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60)
          : 999;

        const { count: anomalies } = await supabase
          .from("detected_anomalies")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id)
          .is("acknowledged_at", null);

        const anomaliesUnresolved = anomalies || 0;

        const dataQualityScore = Math.round(
          syncSuccessRate * 40 +
          Math.max(0, 1 - hoursSinceSync / 24) * 30 +
          Math.max(0, 1 - anomaliesUnresolved / 5) * 30
        );

        // WEIGHTED AVERAGE
        const totalScore = Math.round(
          adoptionScore * 0.25 +
          engagementScore * 0.25 +
          performanceScore * 0.3 +
          dataQualityScore * 0.2
        );

        // RISK LEVEL
        let riskLevel: "healthy" | "at_risk" | "critical";
        if (totalScore >= 70) {
          riskLevel = "healthy";
        } else if (totalScore >= 50) {
          riskLevel = "at_risk";
        } else {
          riskLevel = "critical";
        }

        // FETCH HISTORICAL SCORES
        const { data: historicalScores } = await supabase
          .from("organization_health_scores")
          .select("score, score_date")
          .eq("organization_id", org.id)
          .order("score_date", { ascending: false })
          .limit(30);

        const score7dAgo = historicalScores?.find(
          (s) => new Date(s.score_date).getTime() <= Date.now() - 7 * 24 * 60 * 60 * 1000
        )?.score || null;

        const score30dAgo = historicalScores?.find(
          (s) => new Date(s.score_date).getTime() <= Date.now() - 30 * 24 * 60 * 60 * 1000
        )?.score || null;

        let trend: "improving" | "stable" | "declining" = "stable";
        if (score7dAgo !== null) {
          const diff = totalScore - Number(score7dAgo);
          if (diff >= 5) trend = "improving";
          else if (diff <= -5) trend = "declining";
        }

        // GENERATE RECOMMENDATIONS
        const recommendations: string[] = [];
        
        if (adoptionScore < 60) {
          recommendations.push(
            `Adoption is low (${adoptionScore}/100). Consider scheduling training sessions to increase platform usage.`
          );
        }
        if (engagementScore < 60) {
          recommendations.push(
            `Engagement needs improvement (${engagementScore}/100). Encourage team communication through announcements and chat.`
          );
        }
        if (performanceScore < 60) {
          recommendations.push(
            `Performance metrics are concerning (${performanceScore}/100). Review booking trends and revenue patterns.`
          );
        }
        if (dataQualityScore < 60) {
          recommendations.push(
            `Data quality issues detected (${dataQualityScore}/100). Check sync status and resolve any anomalies.`
          );
        }

        const scoreData: OrganizationScore = {
          organization_id: org.id,
          organization_name: org.name,
          score: totalScore,
          risk_level: riskLevel,
          score_breakdown: {
            adoption: {
              score: adoptionScore,
              factors: {
                active_users: activeUsersCount,
                total_users: totalUsersCount,
                login_frequency: loginFrequency,
                features_used: featuresUsed,
              },
            },
            engagement: {
              score: engagementScore,
              factors: {
                chat_messages_7d: chatCount,
                announcements_count: announcementsCount,
                tasks_completed: 0,
              },
            },
            performance: {
              score: performanceScore,
              factors: {
                revenue_current: currentRevenue,
                revenue_previous: previousRevenue,
                revenue_trend: revenueTrend,
                booking_count: bookingCount || 0,
                avg_ticket: avgTicket,
              },
            },
            data_quality: {
              score: dataQualityScore,
              factors: {
                sync_success_rate: syncSuccessRate,
                hours_since_sync: hoursSinceSync,
                anomalies_unresolved: anomaliesUnresolved,
              },
            },
          },
          trends: {
            score_7d_ago: score7dAgo ? Number(score7dAgo) : null,
            score_30d_ago: score30dAgo ? Number(score30dAgo) : null,
            trend,
          },
          recommendations,
        };

        scores.push(scoreData);

        // Upsert to database
        await supabase.from("organization_health_scores").upsert(
          {
            organization_id: org.id,
            score: totalScore,
            risk_level: riskLevel,
            score_breakdown: scoreData.score_breakdown,
            trends: scoreData.trends,
            recommendations: recommendations,
            score_date: today,
            calculated_at: new Date().toISOString(),
          },
          {
            onConflict: "organization_id,score_date",
          }
        );
      } catch (orgError) {
        console.error(`Error processing org ${org.id}:`, orgError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: scores.length,
        scores: scores.map((s) => ({
          organization_id: s.organization_id,
          organization_name: s.organization_name,
          score: s.score,
          risk_level: s.risk_level,
        })),
      }),
      {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Health score calculation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
