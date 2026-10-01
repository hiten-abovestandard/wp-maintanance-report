// Shared between send-management-digest (scheduled) and send-instant-task-email
// (admin-triggered), so both cycles ever produce one consistent email look.

export function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function priorityDefaultStart(priority: string, createdAt: string, expectedDate: string) {
  if (priority === "high") return createdAt.slice(0, 10);
  if (priority === "medium") return addDaysISO(expectedDate, -2);
  return addDaysISO(expectedDate, -1); // low
}

export function effectiveNotify(task: any) {
  const defaultStart = priorityDefaultStart(task.priority, task.created_at, task.expected_delivery_date);
  return {
    morning: task.notify_morning ?? true,
    evening: task.notify_evening ?? true,
    startDate: task.notify_start_date ?? defaultStart,
    maxCount: task.notify_max_count,
  };
}

export function isOverdue(task: any, today: string) {
  return task.status !== "completed" && task.expected_delivery_date < today;
}
export function isDueToday(task: any, today: string) {
  return task.expected_delivery_date === today;
}
export function advanceEligible(task: any, today: string, cycle: "morning" | "evening") {
  const eff = effectiveNotify(task);
  if (!eff[cycle]) return false;
  if (today < eff.startDate) return false;
  if (eff.maxCount != null && task.notify_sent_count >= eff.maxCount) return false;
  return true;
}

export function assigneeEmails(task: any) {
  return (task.assignees || []).map((a: any) => a.member?.email).filter(Boolean);
}

export function taskLink(appBaseUrl: string, id: string) {
  return `${appBaseUrl.replace(/\/$/, "")}/#/management/tasks/${id}`;
}

export function taskRow(task: any, appBaseUrl: string) {
  const link = taskLink(appBaseUrl, task.id);
  const assignees = assigneeEmails(task).join(", ") || "Unassigned";
  const cowork = task.cowork_link
    ? ` &nbsp;·&nbsp; <a href="${task.cowork_link}" style="color:#4338ca;">Open Cowork</a>` : "";
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
      <a href="${link}" style="color:#111827;font-weight:600;text-decoration:none;">${task.title}</a>${cowork}
    </td>
    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${task.priority}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${assignees}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${task.expected_delivery_date}</td>
    <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${task.status.replace("_"," ")}</td>
  </tr>`;
}

export function tableSection(title: string, tasks: any[], appBaseUrl: string) {
  if (!tasks.length) return "";
  return `
  <h3 style="font-family:sans-serif;color:#111827;margin:24px 0 8px;">${title}</h3>
  <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:14px;color:#374151;">
    <thead><tr style="text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase;">
      <th style="padding:6px 12px;">Task</th><th style="padding:6px 12px;">Priority</th>
      <th style="padding:6px 12px;">Assigned To</th><th style="padding:6px 12px;">Expected Delivery</th>
      <th style="padding:6px 12px;">Status</th>
    </tr></thead>
    <tbody>${tasks.map(t => taskRow(t, appBaseUrl)).join("")}</tbody>
  </table>`;
}

export function instantNoticeBanner(task: any) {
  const eff = effectiveNotify(task);
  const cycles = eff.morning && eff.evening ? "morning and evening updates"
    : eff.morning ? "morning updates" : eff.evening ? "evening updates" : "future scheduled updates";
  const until = task.notify_stop_on_complete ? "until it is completed" : "on its configured schedule";
  return `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
    <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">
      <strong>This email has been sent instantly.</strong> Please have a look at this task as soon as possible.
      This task will also be included in the scheduled ${cycles} ${until}, according to its current notification settings.
    </p>
  </div>`;
}

export function wrapEmail(greeting: string, intro: string, bodyHtml: string) {
  return `<div style="max-width:640px;margin:0 auto;font-family:sans-serif;">
    <h2 style="font-family:sans-serif;color:#111827;">${greeting}</h2>
    <p style="color:#374151;font-size:14px;line-height:1.6;">${intro}</p>
    ${bodyHtml}
    <p style="color:#9ca3af;font-size:12px;margin-top:32px;">Sent automatically by the Management Dashboard.</p>
  </div>`;
}

export async function sendEmail(apiKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) console.error("Resend error", res.status, text);
  return { to, ok: res.ok, status: res.status, detail: text };
}

export const DEFAULT_FROM = "Management <onboarding@resend.dev>";
export const DEFAULT_APP_BASE_URL = "https://hiten-abovestandard.github.io/wp-maintanance-report/";
