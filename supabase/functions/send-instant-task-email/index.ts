import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  assigneeEmails, tableSection, instantNoticeBanner, wrapEmail, sendEmail, DEFAULT_FROM, DEFAULT_APP_BASE_URL,
} from "../_shared/emailTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { taskId?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const taskId = body?.taskId;
  if (!taskId) return json({ error: "Missing taskId" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromAddress = Deno.env.get("RESEND_FROM") || DEFAULT_FROM;
  const appBaseUrl = Deno.env.get("APP_BASE_URL") || DEFAULT_APP_BASE_URL;
  if (!resendKey) return json({ error: "Email sending isn't configured yet. Contact your admin." }, 500);

  // Acts as the calling user (their session JWT is forwarded automatically by
  // supabase.functions.invoke), so RLS's is_admin() policies gate everything
  // below — no separate admin check needed here.
  const authHeader = req.headers.get("Authorization") || "";
  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "You must be signed in to send this email." }, 401);

  const { data: task, error: taskError } = await supabase
    .from("mgmt_tasks")
    .select("*, assignees:mgmt_task_assignees(member:profiles(id,email,name))")
    .eq("id", taskId)
    .is("deleted_at", null)
    .maybeSingle();
  if (taskError) return json({ error: "Couldn't load the task. Please try again." }, 500);
  if (!task) return json({ error: "This task couldn't be found, or you don't have access to it." }, 404);
  if (!task.title?.trim()) return json({ error: "This task is missing a title and can't be emailed." }, 400);
  if (!task.expected_delivery_date) return json({ error: "This task is missing an expected delivery date and can't be emailed." }, 400);

  const { data: fyiRows } = await supabase.from("mgmt_fyi_recipients").select("email").eq("active", true);
  const fyiEmails: string[] = (fyiRows || []).map((r: any) => r.email);

  const recipientSet = new Set<string>([...assigneeEmails(task), ...fyiEmails]);
  const recipients = [...recipientSet];
  if (!recipients.length) {
    return json({ error: "This task has no assigned members or active FYI recipients, so there's nobody to email." }, 400);
  }

  const subject = `Instant Task Update: ${task.title}`;
  const html = wrapEmail(
    "Instant Task Update",
    "",
    instantNoticeBanner(task) + tableSection("Task", [task], appBaseUrl)
  );

  const sendResults = await Promise.all(recipients.map(to => sendEmail(resendKey, fromAddress, to, subject, html)));
  const anySent = sendResults.some(r => r.ok);
  const status = anySent ? "sent" : "failed";
  const errorDetail = sendResults.filter(r => !r.ok).map(r => `${r.to}: ${r.detail}`).join("; ");

  const { error: logError } = await supabase.from("mgmt_task_email_log").insert({
    task_id: taskId, sent_by: user.id, recipients, email_type: "instant",
    status, error: errorDetail || null,
  });
  if (logError) console.error("Failed to log instant email", logError);

  if (!anySent) {
    return json({ error: "The email could not be sent. Please check the task recipients and try again." }, 502);
  }

  return json({ success: true, recipients, status });
});
