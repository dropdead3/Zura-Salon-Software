import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { loadZuraConfig, buildZuraPromptPrefix } from "../_shared/zura-config-loader.ts";
import { AI_ASSISTANT_NAME_DEFAULT as AI_ASSISTANT_NAME } from "../_shared/brand.ts";
import { requireAuth, requireOrgMember, authErrorResponse } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateBody, ValidationError, z } from "../_shared/validation.ts";

const AgentChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })).min(1),
  userId: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  organization_id: z.string().uuid().optional(),
  userRole: z.string().max(50).optional(),
});

const SYSTEM_PROMPT = `You are ${AI_ASSISTANT_NAME}, the AI assistant for a salon management system. Users may address you as "${AI_ASSISTANT_NAME}" or "Hey ${AI_ASSISTANT_NAME}". You help staff members manage appointments, look up client information, and check availability. You are friendly, efficient, and professional.

When users ask you to perform actions, use the available tools to help them. Always confirm destructive actions before executing them.

Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

For appointment times, use 12-hour format (e.g., "3:00 PM").
For dates, be flexible - understand "tomorrow", "next Tuesday", etc.

When proposing changes like rescheduling or cancelling, always show the user what will happen and wait for their confirmation.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_clients",
      description: "Search for clients by name, phone number, or email",
      parameters: {
        type: "object",
        properties: {
          query: { 
            type: "string", 
            description: "The search query - can be client name, phone, or email" 
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_client_appointments",
      description: "Get upcoming appointments for a specific client",
      parameters: {
        type: "object",
        properties: {
          client_name: { 
            type: "string", 
            description: "The client's name to search for appointments" 
          }
        },
        required: ["client_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_availability",
      description: "Check if a staff member is available at a specific date and time",
      parameters: {
        type: "object",
        properties: {
          staff_name: { 
            type: "string", 
            description: "The staff member's name" 
          },
          date: { 
            type: "string", 
            description: "The date to check (YYYY-MM-DD format or natural language like 'tomorrow')" 
          },
          time: { 
            type: "string", 
            description: "The time to check (e.g., '3:00 PM')" 
          }
        },
        required: ["date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "propose_reschedule",
      description: "Propose rescheduling an appointment to a new date/time. This will show the user a preview and require their confirmation.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { 
            type: "string", 
            description: "The ID of the appointment to reschedule" 
          },
          client_name: {
            type: "string",
            description: "The client's name (used to find the appointment if ID not provided)"
          },
          current_date: {
            type: "string",
            description: "The current appointment date (to identify which appointment)"
          },
          current_time: {
            type: "string",
            description: "The current appointment time (to identify which appointment)"
          },
          new_date: { 
            type: "string", 
            description: "The new date for the appointment (YYYY-MM-DD format)" 
          },
          new_time: { 
            type: "string", 
            description: "The new time for the appointment (e.g., '2:00 PM')" 
          }
        },
        required: ["new_date", "new_time"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "propose_cancel_appointment",
      description: "Propose cancelling an appointment. This will show the user a preview and require their confirmation.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { 
            type: "string", 
            description: "The ID of the appointment to cancel" 
          },
          client_name: {
            type: "string",
            description: "The client's name (used to find the appointment if ID not provided)"
          },
          appointment_date: {
            type: "string",
            description: "The appointment date (to identify which appointment)"
          },
          appointment_time: {
            type: "string",
            description: "The appointment time (to identify which appointment)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_my_schedule",
      description: "Get the current user's appointments for today or a specific date",
      parameters: {
        type: "object",
        properties: {
          date: { 
            type: "string", 
            description: "The date to check (YYYY-MM-DD format or 'today'). Defaults to today." 
          }
        },
        required: []
      }
    }
  }
];

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

async function executeToolCall(
  toolName: string, 
  args: Record<string, unknown>,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  organizationId: string
): Promise<{ result: unknown; action?: unknown }> {
  switch (toolName) {
    case "search_clients": {
      const query = args.query as string;
      const { data, error } = await supabase
        .from('phorest_clients')
        .select('id, first_name, last_name, mobile, email')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,mobile.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);
      
      if (error) throw error;
      return { result: data || [] };
    }

    case "get_client_appointments": {
      const clientName = args.client_name as string;
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('appointments')
        .select('id, client_name, service_name, appointment_date, start_time, end_time, staff_name, status')
        .ilike('client_name', `%${clientName}%`)
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return { result: data || [] };
    }

    case "check_availability": {
      const date = parseDateString(args.date as string);
      const staffName = args.staff_name as string | undefined;
      const time = args.time as string | undefined;
      
      let query = supabase
        .from('appointments')
        .select('id, staff_name, start_time, end_time, client_name')
        .eq('appointment_date', date)
        .neq('status', 'cancelled');
      
      if (staffName) {
        query = query.ilike('staff_name', `%${staffName}%`);
      }
      
      const { data, error } = await query.order('start_time', { ascending: true });
      
      if (error) throw error;
      
      // Return existing appointments so AI can determine availability
      return { 
        result: {
          date,
          existing_appointments: data || [],
          message: data?.length ? `Found ${data.length} appointments on ${date}` : `No appointments found on ${date}`
        }
      };
    }

    case "get_my_schedule": {
      const date = args.date ? parseDateString(args.date as string) : new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('appointments')
        .select('id, client_name, service_name, appointment_date, start_time, end_time, status')
        .eq('staff_user_id', userId)
        .eq('appointment_date', date)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return { result: data || [] };
    }

    case "propose_reschedule": {
      // Find the appointment
      let appointmentQuery = supabase
        .from('appointments')
        .select('id, client_name, service_name, appointment_date, start_time, end_time, staff_name, staff_user_id, location_id')
        .neq('status', 'cancelled');
      
      if (args.appointment_id) {
        appointmentQuery = appointmentQuery.eq('id', args.appointment_id);
      } else if (args.client_name) {
        appointmentQuery = appointmentQuery.ilike('client_name', `%${args.client_name}%`);
        if (args.current_date) {
          appointmentQuery = appointmentQuery.eq('appointment_date', parseDateString(args.current_date as string));
        }
      }
      
      const { data: appointments, error } = await appointmentQuery.limit(1);
      
      if (error) throw error;
      if (!appointments?.length) {
        return { result: { error: "No matching appointment found" } };
      }
      
      const appointment = appointments[0];
      const newDate = parseDateString(args.new_date as string);
      const newTime = parseTimeString(args.new_time as string);
      
      // Create action proposal
      return {
        result: { 
          message: "I've prepared the reschedule. Please confirm the change below."
        },
        action: {
          type: 'reschedule',
          status: 'pending_confirmation',
          preview: {
            title: 'Reschedule Appointment',
            description: `Move ${appointment.client_name}'s appointment`,
            before: {
              date: appointment.appointment_date,
              time: appointment.start_time,
              client: appointment.client_name,
              service: appointment.service_name,
              stylist: appointment.staff_name
            },
            after: {
              date: newDate,
              time: newTime,
              client: appointment.client_name,
              service: appointment.service_name,
              stylist: appointment.staff_name
            }
          },
          params: {
            appointment_id: appointment.id,
            new_date: newDate,
            new_time: newTime,
            staff_user_id: appointment.staff_user_id,
            location_id: appointment.location_id
          }
        }
      };
    }

    case "propose_cancel_appointment": {
      let appointmentQuery = supabase
        .from('appointments')
        .select('id, client_name, service_name, appointment_date, start_time, staff_name')
        .neq('status', 'cancelled');
      
      if (args.appointment_id) {
        appointmentQuery = appointmentQuery.eq('id', args.appointment_id);
      } else if (args.client_name) {
        appointmentQuery = appointmentQuery.ilike('client_name', `%${args.client_name}%`);
        if (args.appointment_date) {
          appointmentQuery = appointmentQuery.eq('appointment_date', parseDateString(args.appointment_date as string));
        }
      }
      
      const { data: appointments, error } = await appointmentQuery
        .order('appointment_date', { ascending: true })
        .limit(1);
      
      if (error) throw error;
      if (!appointments?.length) {
        return { result: { error: "No matching appointment found" } };
      }
      
      const appointment = appointments[0];
      
      return {
        result: { 
          message: "I've prepared the cancellation. Please confirm below."
        },
        action: {
          type: 'cancel',
          status: 'pending_confirmation',
          preview: {
            title: 'Cancel Appointment',
            description: `Cancel ${appointment.client_name}'s appointment`,
            before: {
              date: appointment.appointment_date,
              time: appointment.start_time,
              client: appointment.client_name,
              service: appointment.service_name,
              stylist: appointment.staff_name
            }
          },
          params: {
            appointment_id: appointment.id
          }
        }
      };
    }

    default:
      return { result: { error: `Unknown tool: ${toolName}` } };
  }
}

function parseDateString(dateStr: string): string {
  const today = new Date();
  const lower = dateStr.toLowerCase().trim();
  
  if (lower === 'today') {
    return today.toISOString().split('T')[0];
  }
  if (lower === 'tomorrow') {
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  }
  if (lower.startsWith('next ')) {
    const dayName = lower.replace('next ', '');
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName);
    if (targetDay !== -1) {
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      today.setDate(today.getDate() + daysUntil);
      return today.toISOString().split('T')[0];
    }
  }
  
  // Try parsing as ISO date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try parsing natural date
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return today.toISOString().split('T')[0];
}

function parseTimeString(timeStr: string): string {
  // Convert "3:00 PM" to "15:00:00"
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (!match) return timeStr;
  
  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const period = match[3]?.toLowerCase();
  
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as any;
    
    const body = await validateBody(req, AgentChatSchema, getCorsHeaders(req));
    const { messages, userId, organizationId, userRole } = body;
    const orgId = body.organizationId || body.organization_id;
    if (!orgId) {
      return authErrorResponse({ status: 400, message: "organizationId is required" }, getCorsHeaders(req));
    }
    // Verify org access
    try {
      await requireOrgMember(supabaseAdmin, user.id, orgId);
    } catch (orgErr) {
      return authErrorResponse(orgErr, getCorsHeaders(req));
    }

    // Load dynamic Zura config
    let dynamicSystemPrompt = SYSTEM_PROMPT;
    if (organizationId) {
      try {
        const config = await loadZuraConfig(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, organizationId, "ai-agent-chat", userRole || null);
        const prefix = buildZuraPromptPrefix(config);
        if (prefix) {
          dynamicSystemPrompt = prefix + SYSTEM_PROMPT;
        }
        if (config.personality?.display_name && config.personality.display_name !== AI_ASSISTANT_NAME) {
          dynamicSystemPrompt = dynamicSystemPrompt.replace(new RegExp(`You are ${AI_ASSISTANT_NAME}`, 'g'), `You are ${config.personality.display_name}`);
          dynamicSystemPrompt = dynamicSystemPrompt.replace(new RegExp(`"${AI_ASSISTANT_NAME}"`, 'g'), `"${config.personality.display_name}"`);
        }
      } catch (e) {
        console.error("Failed to load AI config:", e);
      }
    }

    // Build messages with system prompt
    const aiMessages: Message[] = [
      { role: "system", content: dynamicSystemPrompt },
      ...messages
    ];

    // Call AI with tools
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];
    
    if (!choice) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Check if AI wants to call tools
    if (choice.message?.tool_calls?.length > 0) {
      const toolResults: unknown[] = [];
      let action: unknown = null;

      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`Executing tool: ${toolName}`, toolArgs);
        
        const { result, action: toolAction } = await executeToolCall(
          toolName, 
          toolArgs, 
          supabase, 
          userId || user.id, 
          orgId
        );
        
        toolResults.push({
          tool_call_id: toolCall.id,
          name: toolName,
          result
        });
        
        if (toolAction) {
          action = toolAction;
        }
      }

      // Call AI again with tool results to get final response
      const followUpMessages = [
        ...aiMessages,
        choice.message,
        ...toolResults.map(tr => ({
          role: "tool" as const,
          tool_call_id: (tr as { tool_call_id: string }).tool_call_id,
          content: JSON.stringify((tr as { result: unknown }).result)
        }))
      ];

      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: followUpMessages,
        }),
      });

      if (!followUpResponse.ok) {
        const errorText = await followUpResponse.text();
        console.error("Follow-up AI error:", followUpResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI service error during follow-up" }),
          { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }

      const followUpResult = await followUpResponse.json();
      const finalMessage = followUpResult.choices?.[0]?.message?.content || "I completed the operation.";

      return new Response(
        JSON.stringify({
          message: finalMessage,
          action,
          toolsUsed: toolResults.map(tr => (tr as { name: string }).name)
        }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // No tools called, return direct response
    return new Response(
      JSON.stringify({
        message: choice.message?.content || "I'm not sure how to help with that.",
        action: null
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("ai-agent-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
