import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { studentId, studentName, universityId, idFrontUrl, idBackUrl, carnetUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!idFrontUrl || !idBackUrl || !carnetUrl) {
      return new Response(JSON.stringify({ error: "Missing required photos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
            content: `You are an identity verification AI for Beni Suef Technological University (BTU/BSUT). You verify student identity by comparing their ID card (front and back) and university carnet with their profile information. Check if the name and ID number on the documents match the provided student info. Extract ALL visible data from the ID card: full name (Arabic and English), national ID number, address/residence, gender, date of birth, religion, marital status, job/occupation, card expiry date. Return verified=true if the documents appear genuine and match, false otherwise.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Verify this student's identity:\nName: ${studentName}\nUniversity ID: ${universityId}\n\nPlease check the following 3 documents, verify they match the student information, and extract ALL visible personal data from the ID card (front and back).` },
              { type: "image_url", image_url: { url: idFrontUrl } },
              { type: "image_url", image_url: { url: idBackUrl } },
              { type: "image_url", image_url: { url: carnetUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "identity_verification_result",
              description: "Return the identity verification result with all extracted data",
              parameters: {
                type: "object",
                properties: {
                  verified: { type: "boolean", description: "Whether the identity is verified" },
                  confidence: { type: "number", description: "Confidence score 0-100" },
                  name_match: { type: "boolean", description: "Whether the name matches" },
                  id_match: { type: "boolean", description: "Whether the ID number matches" },
                  reason: { type: "string", description: "Brief explanation" },
                  extracted_name: { type: "string", description: "Full name extracted from ID card (Arabic and English)" },
                  national_id: { type: "string", description: "National ID number (14 digits)" },
                  address: { type: "string", description: "Address/residence from the ID card" },
                  gender: { type: "string", description: "Gender (male/female or ذكر/أنثى)" },
                  date_of_birth: { type: "string", description: "Date of birth from the ID card" },
                  religion: { type: "string", description: "Religion from the ID card" },
                  marital_status: { type: "string", description: "Marital status from the ID card" },
                  job: { type: "string", description: "Job/occupation from the ID card" },
                  expiry_date: { type: "string", description: "Card expiry date" },
                },
                required: ["verified", "confidence", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "identity_verification_result" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    return new Response(JSON.stringify({ verified: false, confidence: 0, reason: "Could not verify" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-identity error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
