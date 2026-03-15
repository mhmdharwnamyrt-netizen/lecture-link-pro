import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { registeredPhotoUrl, verificationPhotoBase64 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!registeredPhotoUrl || !verificationPhotoBase64) {
      return new Response(JSON.stringify({ error: "Missing photo data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: `You are a face verification system for a university attendance app. Compare the two face images provided. Determine if they show the same person. Use the tool to return your result. Score guidelines: 95-100 = identical person, very clear match; 85-94 = same person, minor angle/lighting differences; 70-84 = possibly same person, significant differences; below 70 = different person or unclear. A score of 85+ means MATCH.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Compare these two photos. The first is the registered student photo, the second is taken now for attendance verification. Are they the same person?" },
              { type: "image_url", image_url: { url: registeredPhotoUrl } },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${verificationPhotoBase64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "face_comparison_result",
              description: "Return the face comparison result",
              parameters: {
                type: "object",
                properties: {
                  match: { type: "boolean", description: "Whether the faces match (score >= 85)" },
                  score: { type: "number", description: "Similarity score 0-100" },
                  reason: { type: "string", description: "Brief explanation of the comparison" },
                },
                required: ["match", "score", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "face_comparison_result" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    // Fallback
    const content = result.choices?.[0]?.message?.content || "";
    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ match: false, score: 0, reason: "Could not process comparison" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("face-verify error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
