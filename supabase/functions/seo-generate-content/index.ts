import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  faq_expansion: `You are an SEO content specialist for a salon/beauty business. Generate 3-5 FAQ Q&A pairs for a specific service page. Each Q&A should:
- Target common client questions
- Include natural keyword usage
- Be 2-3 sentences for each answer
- Be written in a warm, professional tone

Return a JSON object with a "faqs" array of {question, answer} objects.`,

  gbp_post: `You are a Google Business Profile post writer for a salon/beauty business. Generate a GBP post that:
- Has a compelling title (max 80 chars)
- Body text of 100-200 words
- Includes a call-to-action
- Uses natural, engaging language
- Mentions the specific service and location

Return a JSON object with "title" and "body" fields.`,

  service_description_rewrite: `You are an SEO copywriter for a salon/beauty business. Rewrite a service description that:
- Is 150-300 words
- Includes natural keyword usage for the service
- Mentions the location/area for local SEO
- Highlights benefits and unique value
- Includes a booking CTA

Return a JSON object with "description" field.`,

  review_request: `You are a customer success specialist for a salon/beauty business. Draft a personalized review request message that:
- Is warm and genuine (not salesy)
- References the specific service they received
- Makes leaving a review easy (mention Google)
- Is 3-5 sentences max

Return a JSON object with "subject" and "message" fields.`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { templateKey, objectKey, objectLabel, locationName, context, taskId } = await req.json();

    if (!templateKey || !SYSTEM_PROMPTS[templateKey]) {
      return new Response(
        JSON.stringify({ error: `Template '${templateKey}' is not eligible for AI generation.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: max 5 generations per task
    if (taskId) {
      const { data: history } = await supabase
        .from("seo_task_history")
        .select("id")
        .eq("task_id", taskId)
        .eq("action", "ai_content_generated");

      if ((history?.length ?? 0) >= 5) {
        return new Response(
          JSON.stringify({ error: "Generation limit reached (5 per task). Edit content manually." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const systemPrompt = SYSTEM_PROMPTS[templateKey];
    const userPrompt = `Service: ${objectLabel || "General"}
Location: ${locationName || "Main Location"}
Object Key: ${objectKey || "N/A"}
${context ? `Additional Context: ${context}` : ""}

Generate the content now.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_content",
              description: "Return the generated SEO content.",
              parameters: getSchemaForTemplate(templateKey),
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_content" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI generation failed");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let content: any = {};

    if (toolCall?.function?.arguments) {
      try {
        content = JSON.parse(toolCall.function.arguments);
      } catch {
        content = { raw: toolCall.function.arguments };
      }
    } else {
      // Fallback: try to parse from message content
      const rawContent = aiResult.choices?.[0]?.message?.content || "";
      try {
        content = JSON.parse(rawContent);
      } catch {
        content = { raw: rawContent };
      }
    }

    // Log generation in task history
    if (taskId) {
      await supabase.from("seo_task_history").insert({
        task_id: taskId,
        action: "ai_content_generated",
        notes: `Generated ${templateKey} content via AI`,
        performed_by: null,
      });
    }

    // Build preview string
    const preview = buildPreview(templateKey, content);

    return new Response(
      JSON.stringify({ generated: true, content, preview }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("seo-generate-content error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getSchemaForTemplate(templateKey: string) {
  switch (templateKey) {
    case "faq_expansion":
      return {
        type: "object",
        properties: {
          faqs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                answer: { type: "string" },
              },
              required: ["question", "answer"],
            },
          },
        },
        required: ["faqs"],
      };
    case "gbp_post":
      return {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
        },
        required: ["title", "body"],
      };
    case "service_description_rewrite":
      return {
        type: "object",
        properties: {
          description: { type: "string" },
        },
        required: ["description"],
      };
    case "review_request":
      return {
        type: "object",
        properties: {
          subject: { type: "string" },
          message: { type: "string" },
        },
        required: ["subject", "message"],
      };
    default:
      return { type: "object", properties: {} };
  }
}

function buildPreview(templateKey: string, content: any): string {
  switch (templateKey) {
    case "faq_expansion":
      return (content.faqs || [])
        .map((f: any) => `Q: ${f.question}\nA: ${f.answer}`)
        .join("\n\n");
    case "gbp_post":
      return `${content.title || ""}\n\n${content.body || ""}`;
    case "service_description_rewrite":
      return content.description || "";
    case "review_request":
      return `Subject: ${content.subject || ""}\n\n${content.message || ""}`;
    default:
      return JSON.stringify(content, null, 2);
  }
}
