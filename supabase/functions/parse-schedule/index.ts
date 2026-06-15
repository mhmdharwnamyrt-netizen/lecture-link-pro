import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const imageUrls: string[] = body.imageUrls && Array.isArray(body.imageUrls)
      ? body.imageUrls
      : body.imageUrl ? [body.imageUrl] : [];
    const subjectsFilter: string[] = Array.isArray(body.subjects) ? body.subjects : [];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (imageUrls.length === 0) {
      return new Response(JSON.stringify({ error: "Missing imageUrl(s)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent: any[] = [
      { type: "text", text: `Parse ${imageUrls.length > 1 ? `these ${imageUrls.length} university schedule images` : "this university schedule image"}. Extract every lecture/section with its day, time, hall number, and subject name.${subjectsFilter.length ? ` Only include lectures whose subject matches one of: ${subjectsFilter.join(", ")}.` : ""} Merge duplicate entries across images.` },
      ...imageUrls.map(url => ({ type: "image_url", image_url: { url } })),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a university schedule parser AI agent. You analyze images of academic schedules/timetables and extract structured lecture information. Extract ALL lectures visible. For each lecture, extract: title (subject name), day of week, start time, end time, hall/room number, and type (lecture or section). If multiple images are given, merge duplicates. Use the tool to return results.`,
          },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "schedule_parse_result",
              description: "Return parsed schedule entries",
              parameters: {
                type: "object",
                properties: {
                  lectures: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Subject/lecture name" },
                        type: { type: "string", enum: ["lecture", "section"], description: "Type of class" },
                        day_of_week: { type: "string", enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] },
                        start_time: { type: "string", description: "Start time in HH:MM format (24h)" },
                        end_time: { type: "string", description: "End time in HH:MM format (24h)" },
                        hall_number: { type: "number", description: "Hall/room number" },
                      },
                      required: ["title", "type", "day_of_week", "start_time", "end_time"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string", description: "Brief summary of what was found" },
                },
                required: ["lectures", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "schedule_parse_result" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ lectures: [], summary: "Could not parse schedule" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-schedule error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
