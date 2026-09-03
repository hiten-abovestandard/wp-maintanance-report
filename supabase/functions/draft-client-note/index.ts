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

  let payload: { body?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const reportBody = (payload?.body || "").trim();
  if (!reportBody) return json({ error: "Missing report body" }, 400);

  const apiKey = Deno.env.get("OPEN_ROUTER_API_KEY");
  if (!apiKey) return json({ error: "AI drafting isn't configured" }, 500);

  const model = Deno.env.get("OPENROUTER_MODEL") || DEFAULT_MODEL;

  const messages = [
    {
      role: "system",
      content:
        "You write short, warm intro notes for a WordPress monthly maintenance report sent to a client. " +
        "Write 2-4 plain-text sentences, no markdown, no greeting placeholders, no sign-off. " +
        "Summarize the work below at a high level and reassure the client their site is well maintained.",
    },
    { role: "user", content: reportBody },
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
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 220 }),
    });
  } catch {
    return json({ error: "Couldn't reach the AI service" }, 502);
  }

  if (!aiRes.ok) {
    console.error("OpenRouter error", aiRes.status, await aiRes.text().catch(() => ""));
    return json({ error: "AI drafting failed" }, 502);
  }

  const data = await aiRes.json();
  const note = data?.choices?.[0]?.message?.content?.trim();
  if (!note) return json({ error: "AI returned an empty draft" }, 502);

  return json({ note });
});
