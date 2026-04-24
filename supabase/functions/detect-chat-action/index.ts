import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an AI that analyzes chat messages between salon team members to detect actionable requests. Your job is to identify when one person is asking another for help with work-related tasks.

Analyze the message and determine if it contains an actionable request. If it does, extract the relevant details.

ACTION TYPES:
- client_handoff: Asking someone to take over a client/appointment (e.g., "Can you take my 3pm?", "Can someone cover Jane at 2?")
- assistant_request: Asking for help assisting with a service (e.g., "I need help with a balayage", "Can you assist me at 4?")
- shift_cover: Asking someone to cover a shift or day (e.g., "Anyone cover Saturday?", "I can't make it tomorrow")
- availability_check: Asking about someone's availability (e.g., "Are you free at 2?", "Can you stay late?")
- product_request: Asking for products or supplies (e.g., "Can you grab me some developer?")

IMPORTANT RULES:
1. Only return an action if the message is clearly a REQUEST for help/action from another person
2. General conversation, statements, or responses should return null
3. Extract any time, date, client name, or service mentioned
4. Be conservative - only detect clear actionable requests
5. If the message is a response/confirmation (like "Yes I can" or "Sure"), that's NOT an action request`;

interface ActionDetectionResult {
  action_type: string | null;
  confidence: number;
  detected_intent: string;
  extracted_data: {
    time?: string;
    date?: string;
    client_name?: string;
    service?: string;
    notes?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { messageId, messageContent, senderId, channelId, organizationId, targetUserId } = await req.json();

    if (!messageContent || !messageId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI with tool calling for structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze this message and detect if it contains an actionable request:\n\n"${messageContent}"` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "detect_action",
              description: "Detect if the message contains an actionable request between team members",
              parameters: {
                type: "object",
                properties: {
                  action_type: {
                    type: "string",
                    enum: ["client_handoff", "assistant_request", "shift_cover", "availability_check", "product_request", "none"],
                    description: "The type of action being requested, or 'none' if no action detected"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score from 0.0 to 1.0"
                  },
                  detected_intent: {
                    type: "string",
                    description: "A brief description of what was requested"
                  },
                  extracted_data: {
                    type: "object",
                    properties: {
                      time: { type: "string", description: "Time mentioned (e.g., '3pm', '14:00')" },
                      date: { type: "string", description: "Date mentioned (e.g., 'tomorrow', 'Saturday')" },
                      client_name: { type: "string", description: "Client name if mentioned" },
                      service: { type: "string", description: "Service type if mentioned (e.g., 'balayage', 'haircut')" },
                      notes: { type: "string", description: "Any additional context" }
                    }
                  }
                },
                required: ["action_type", "confidence", "detected_intent"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "detect_action" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ detected: false, reason: "No action detected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result: ActionDetectionResult = JSON.parse(toolCall.function.arguments);

    // If no action or low confidence, skip
    if (result.action_type === "none" || result.confidence < 0.7) {
      return new Response(
        JSON.stringify({ detected: false, reason: "No actionable request detected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If action detected and we have all required context, save to database
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && organizationId && targetUserId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as any;

      const { data: smartAction, error: insertError } = await supabase
        .from("chat_smart_actions")
        .insert({
          organization_id: organizationId,
          channel_id: channelId,
          message_id: messageId,
          sender_id: senderId,
          target_user_id: targetUserId,
          action_type: result.action_type,
          confidence: result.confidence,
          detected_intent: result.detected_intent,
          extracted_data: result.extracted_data || {},
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to save smart action:", insertError);
      } else {
        console.log("Smart action created:", smartAction?.id);
      }

      return new Response(
        JSON.stringify({
          detected: true,
          action: result,
          saved: !insertError,
          actionId: smartAction?.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ detected: true, action: result, saved: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("detect-chat-action error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
