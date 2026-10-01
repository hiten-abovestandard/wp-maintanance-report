import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  isOverdue, isDueToday, advanceEligible, assigneeEmails, tableSection, wrapEmail, sendEmail,
  DEFAULT_FROM, DEFAULT_APP_BASE_URL,
} from "../_shared/emailTemplates.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function todayInZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("Authorization") || "";
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: { cycle?: "morning" | "evening"; force?: boolean } = {};
  try { body = await req.json(); } catch { /* no body is fine */ }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromAddress = Deno.env.get("RESEND_FROM") || DEFAULT_FROM;
  const appBaseUrl = Deno.env.get("APP_BASE_URL") || DEFAULT_APP_BASE_URL;
  if (!resendKey) return json({ error: "RESEND_API_KEY isn't configured" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: settings, error: settingsError } = await supabase.from("mgmt_settings").select("*").eq("id", true).single();
  if (settingsError || !settings) return json({ error: "Couldn't load mgmt_settings" }, 500);

  const { date: today, minutes: nowMinutes } = todayInZone(settings.timezone);
  const morningMinutes = timeToMinutes(settings.morning_send_time);
  const eveningMinutes = timeToMinutes(settings.evening_send_time);

  const cyclesDue: Array<"morning" | "evening"> = [];
  if (body.force && body.cycle) {
    cyclesDue.push(body.cycle);
  } else {
    if (nowMinutes >= morningMinutes && nowMinutes < morningMinutes + 15) cyclesDue.push("morning");
    if (nowMinutes >= eveningMinutes && nowMinutes < eveningMinutes + 15) cyclesDue.push("evening");
  }

  if (!cyclesDue.length) return json({ message: "No cycle due right now", today, nowMinutes });

  const { data: tasks, error: tasksError } = await supabase
    .from("mgmt_tasks")
    .select("*, assignees:mgmt_task_assignees(member:profiles(id,email,name))")
    .is("deleted_at", null);
  if (tasksError) return json({ error: tasksError.message }, 500);

  const { data: fyiRows } = await supabase.from("mgmt_fyi_recipients").select("email").eq("active", true);
  const fyiEmails: string[] = (fyiRows || []).map((r: any) => r.email);

  const results: Record<string, any> = {};

  for (const cycle of cyclesDue) {
    let logRow: any;
    if (body.force) {
      const { data, error } = await supabase
        .from("mgmt_digest_log")
        .upsert({ cycle, sent_on: today }, { onConflict: "cycle,sent_on" })
        .select()
        .single();
      if (error) { results[cycle] = { error: error.message }; continue; }
      logRow = data;
    } else {
      const { data, error } = await supabase
        .from("mgmt_digest_log")
        .insert({ cycle, sent_on: today })
        .select()
        .single();
      if (error) { results[cycle] = { skipped: "already sent today" }; continue; }
      logRow = data;
    }

    let sectionsHtml = "";
    let greeting = "";
    let intro = "";
    const includedTaskIds = new Set<string>();
    const advanceTaskIds = new Set<string>();

    if (cycle === "morning") {
      const dueToday = (tasks || []).filter((t: any) => t.status !== "completed" && isDueToday(t, today) && (t.notify_morning ?? true));
      const carryForward = (tasks || []).filter((t: any) => t.status !== "completed" && !isDueToday(t, today) &&
        (isOverdue(t, today) || advanceEligible(t, today, "morning")));

      greeting = "Good Morning";
      intro = "Here is today's task overview.";
      sectionsHtml = tableSection("Today's Priorities", dueToday, appBaseUrl) +
        tableSection("Pending / Carry-Forward Tasks", carryForward, appBaseUrl);

      dueToday.forEach((t: any) => includedTaskIds.add(t.id));
      carryForward.forEach((t: any) => {
        includedTaskIds.add(t.id);
        if (!isOverdue(t, today)) advanceTaskIds.add(t.id);
      });
    } else {
      const completedToday = (tasks || []).filter((t: any) => t.status === "completed" && t.completed_at && t.completed_at.slice(0, 10) === today);
      const followUp = (tasks || []).filter((t: any) => t.status !== "completed" && (isDueToday(t, today) || isOverdue(t, today)));
      const otherHighPending = (tasks || []).filter((t: any) => t.status !== "completed" && t.priority === "high" &&
        !isDueToday(t, today) && !isOverdue(t, today) && advanceEligible(t, today, "evening"));

      greeting = "Good Evening";
      intro = "Here is today's completion summary.";
      sectionsHtml = tableSection("Completed Today", completedToday, appBaseUrl) +
        tableSection("Tasks Requiring Follow-Up", followUp, appBaseUrl) +
        tableSection("Other Pending High-Priority Tasks", otherHighPending, appBaseUrl);

      [...completedToday, ...followUp, ...otherHighPending].forEach((t: any) => includedTaskIds.add(t.id));
      otherHighPending.forEach((t: any) => advanceTaskIds.add(t.id));
    }

    const includedTasks = (tasks || []).filter((t: any) => includedTaskIds.has(t.id));
    const assigneeSet = new Set<string>();
    includedTasks.forEach((t: any) => assigneeEmails(t).forEach((e: string) => assigneeSet.add(e)));
    fyiEmails.forEach(e => assigneeSet.add(e));
    const recipients = [...assigneeSet];

    let sendResults: any[] = [];
    if (includedTasks.length && recipients.length) {
      const subject = cycle === "morning"
        ? `Daily Task Overview – ${today}`
        : `Daily Task Completion Summary – ${today}`;
      const html = wrapEmail(greeting, intro, sectionsHtml);
      sendResults = await Promise.all(recipients.map(to => sendEmail(resendKey, fromAddress, to, subject, html)));

      const anyFailed = sendResults.some(r => !r.ok);
      await supabase.from("mgmt_task_email_log").insert(
        includedTasks.map((t: any) => ({
          task_id: t.id, sent_by: null, recipients, email_type: "scheduled",
          status: anyFailed ? "failed" : "sent",
        }))
      );
    }

    if (advanceTaskIds.size) {
      for (const id of advanceTaskIds) {
        const task = tasks!.find((t: any) => t.id === id);
        await supabase.from("mgmt_tasks").update({ notify_sent_count: (task.notify_sent_count || 0) + 1 }).eq("id", id);
      }
    }

    await supabase.from("mgmt_digest_log")
      .update({ task_count: includedTasks.length, recipient_count: recipients.length })
      .eq("id", logRow.id);

    results[cycle] = { taskCount: includedTasks.length, recipientCount: recipients.length, sendResults };
  }

  return json({ today, results });
});
