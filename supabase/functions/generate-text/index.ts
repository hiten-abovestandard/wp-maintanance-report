const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: { prompt?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const prompt = (payload?.prompt || "").trim();
  if (!prompt) return json({ error: "Missing prompt" }, 400);

  const apiKey = Deno.env.get("OPEN_ROUTER_API_KEY");
  if (!apiKey) return json({ error: "AI generation isn't configured" }, 500);

  const model = Deno.env.get("OPENROUTER_MODEL") || DEFAULT_MODEL;

  const messages = [
    {
      role: "system",
      content:
        "You help write text for a WordPress website maintenance service's communications with " +
        "clients (report notes, emails, messages). Follow the user's instruction exactly and write " +
        "only the requested text. Return plain text only, no markdown, no preamble, no quotes around " +
        "the output.",
    },
    { role: "user", content: prompt },
  ];

  let aiRes: Response;
  try {
    aiRes = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "WP Monthly Maintenance",
      },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 500 }),
    });
  } catch {
    return json({ error: "Couldn't reach the AI service" }, 502);
  }

  if (!aiRes.ok) {
    console.error("OpenRouter error", aiRes.status, await aiRes.text().catch(() => ""));
    return json({ error: "AI generation failed" }, 502);
  }

  const data = await aiRes.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) return json({ error: "AI returned an empty result" }, 502);

  return json({ text });
});
