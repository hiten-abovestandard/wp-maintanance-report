import { supabase } from "../supabaseClient";
import { createAuthUser } from "../adminUserClient";
import { isValidEmail, isValidUrl, friendlyDbError } from "./validators";

const TASK_SELECT = "*, assignees:mgmt_task_assignees(member:profiles(id,email,name))";

// ---- Validation (the "backend" layer for this Supabase-direct SPA: every
// write goes through these functions, so this is where business rules are
// enforced independently of whatever a form component itself checks) ----

function validateTaskInput({ title, expectedDeliveryDate, priority, coworkLink }) {
  if (!title || !title.trim()) return "Task title is required.";
  if (!expectedDeliveryDate) return "Expected delivery date is required.";
  if (!["low", "medium", "high"].includes(priority)) return "Priority must be low, medium, or high.";
  if (!isValidUrl(coworkLink)) return "Please enter a valid Cowork Link URL.";
  return null;
}

export async function listTasks() {
  const { data, error } = await supabase
    .from("mgmt_tasks")
    .select(TASK_SELECT)
    .is("deleted_at", null)
    .order("expected_delivery_date", { ascending: true });
  if (error) throw new Error(friendlyDbError(error));
  return data;
}

export async function getTask(id) {
  const { data, error } = await supabase
    .from("mgmt_tasks")
    .select(TASK_SELECT)
    .eq("id", id)
    .single();
  if (error) throw new Error(friendlyDbError(error, "This task couldn't be found."));
  return data;
}

export async function createTask({ title, description, priority, expectedDeliveryDate, expectedDeliveryTime,
  imageUrl, coworkLink, assigneeIds, notify }) {
  const validationError = validateTaskInput({ title, expectedDeliveryDate, priority, coworkLink });
  if (validationError) throw new Error(validationError);

  const { data: auth } = await supabase.auth.getUser();
  const { data: task, error } = await supabase
    .from("mgmt_tasks")
    .insert({
      title: title.trim(), description: description || "", priority,
      expected_delivery_date: expectedDeliveryDate,
      expected_delivery_time: expectedDeliveryTime || null,
      image_url: imageUrl || null,
      cowork_link: coworkLink || null,
      created_by: auth.user.id,
      notify_morning: notify?.morning ?? null,
      notify_evening: notify?.evening ?? null,
      notify_start_date: notify?.startDate || null,
      notify_repeat: notify?.repeat ?? null,
      notify_max_count: notify?.maxCount ?? null,
      notify_stop_on_complete: notify?.stopOnComplete ?? true,
    })
    .select()
    .single();
  if (error) throw new Error(friendlyDbError(error, "Couldn't create the task. Please try again."));

  if (assigneeIds?.length) {
    const { error: assigneesError } = await supabase.from("mgmt_task_assignees").insert(
      assigneeIds.map((memberId) => ({ task_id: task.id, member_id: memberId }))
    );
    if (assigneesError) throw new Error(friendlyDbError(assigneesError, "The task was created, but assigning members failed."));
  }
  return task;
}

export async function updateTask(id, { title, description, priority, status, expectedDeliveryDate,
  expectedDeliveryTime, imageUrl, coworkLink, notify }) {
  const validationError = validateTaskInput({ title, expectedDeliveryDate, priority, coworkLink });
  if (validationError) throw new Error(validationError);
  if (status && !["pending", "in_progress", "completed"].includes(status)) {
    throw new Error("Status must be pending, in progress, or completed.");
  }

  const { data, error } = await supabase
    .from("mgmt_tasks")
    .update({
      title: title.trim(), description: description || "", priority, status,
      expected_delivery_date: expectedDeliveryDate,
      expected_delivery_time: expectedDeliveryTime || null,
      image_url: imageUrl || null,
      cowork_link: coworkLink || null,
      notify_morning: notify?.morning ?? null,
      notify_evening: notify?.evening ?? null,
      notify_start_date: notify?.startDate || null,
      notify_repeat: notify?.repeat ?? null,
      notify_max_count: notify?.maxCount ?? null,
      notify_stop_on_complete: notify?.stopOnComplete ?? true,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(friendlyDbError(error, "Couldn't save the task. Please try again."));
  return data;
}

export async function setTaskAssignees(taskId, memberIds) {
  const { error: delError } = await supabase.from("mgmt_task_assignees").delete().eq("task_id", taskId);
  if (delError) throw new Error(friendlyDbError(delError));
  if (memberIds.length) {
    const { error } = await supabase.from("mgmt_task_assignees").insert(
      memberIds.map((memberId) => ({ task_id: taskId, member_id: memberId }))
    );
    if (error) throw new Error(friendlyDbError(error, "Couldn't save the assigned members."));
  }
}

export async function deleteTask(id) {
  const { error } = await supabase.from("mgmt_tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(friendlyDbError(error));
}

export async function uploadTaskImage(file) {
  const path = `${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("management-task-images").upload(path, file);
  if (error) throw new Error(friendlyDbError(error, "Couldn't upload the image. Please try again."));
  const { data } = supabase.storage.from("management-task-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function sendInstantEmail(taskId) {
  const { data, error } = await supabase.functions.invoke("send-instant-task-email", { body: { taskId } });
  if (error) throw new Error(friendlyDbError(error, "The email could not be sent. Please check the task recipients and try again."));
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function listTaskEmailHistory(taskId) {
  const { data, error } = await supabase
    .from("mgmt_task_email_log")
    .select("*, sender:profiles(email,name)")
    .eq("task_id", taskId)
    .order("sent_at", { ascending: false });
  if (error) throw new Error(friendlyDbError(error));
  return data;
}

// ---- Members ----

export async function listMembers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("department", "management")
    .eq("role", "member")
    .order("created_at", { ascending: false });
  if (error) throw new Error(friendlyDbError(error));
  return data;
}

export async function addMember(name, email, password) {
  if (!name || !name.trim()) throw new Error("Name is required.");
  if (!isValidEmail(email)) throw new Error("Please enter a valid email address.");
  if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");

  const { data: existing } = await supabase.from("profiles").select("id").eq("email", email.trim()).maybeSingle();
  if (existing) throw new Error("This email address is already registered. Please use a different email address.");

  const user = await createAuthUser(email.trim(), password);
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, email: email.trim(), name: name.trim(), department: "management", role: "member" })
    .select()
    .single();
  if (error) throw new Error(friendlyDbError(error, "Couldn't add the member. Please try again."));
  return data;
}

export async function setMemberBlocked(id, blocked) {
  const { error } = await supabase.from("profiles").update({ blocked }).eq("id", id);
  if (error) throw new Error(friendlyDbError(error));
}

export async function removeMember(id) {
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw new Error(friendlyDbError(error));
}

// ---- FYI recipients ----

export async function listFyiRecipients() {
  const { data, error } = await supabase
    .from("mgmt_fyi_recipients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(friendlyDbError(error));
  return data;
}

export async function addFyiRecipient(email, name) {
  if (!isValidEmail(email)) throw new Error("Please enter a valid email address.");

  const { data: existing } = await supabase.from("mgmt_fyi_recipients").select("id").eq("email", email.trim()).maybeSingle();
  if (existing) throw new Error("This email address is already registered. Please use a different email address.");

  const { data, error } = await supabase
    .from("mgmt_fyi_recipients")
    .insert({ email: email.trim(), name: name?.trim() || null })
    .select()
    .single();
  if (error) throw new Error(friendlyDbError(error, "Couldn't add the recipient. Please try again."));
  return data;
}

export async function setFyiRecipientActive(id, active) {
  const { error } = await supabase.from("mgmt_fyi_recipients").update({ active }).eq("id", id);
  if (error) throw new Error(friendlyDbError(error));
}

export async function removeFyiRecipient(id) {
  const { error } = await supabase.from("mgmt_fyi_recipients").delete().eq("id", id);
  if (error) throw new Error(friendlyDbError(error));
}

// ---- Settings ----

export async function getSettings() {
  const { data, error } = await supabase.from("mgmt_settings").select("*").eq("id", true).single();
  if (error) throw new Error(friendlyDbError(error));
  return data;
}

export async function updateSettings({ morningSendTime, eveningSendTime, timezone }) {
  if (!morningSendTime || !eveningSendTime) throw new Error("Both send times are required.");
  if (!timezone || !timezone.trim()) throw new Error("Timezone is required.");
  const { error } = await supabase.from("mgmt_settings")
    .update({ morning_send_time: morningSendTime, evening_send_time: eveningSendTime, timezone: timezone.trim() })
    .eq("id", true);
  if (error) throw new Error(friendlyDbError(error, "Couldn't save settings. Please try again."));
}

// ---- Shared helpers ----

export const PRIORITY_LABEL = {
  low: { label: "Low", color: "var(--muted)" },
  medium: { label: "Medium", color: "var(--warn)" },
  high: { label: "High", color: "var(--danger)" },
};

export const STATUS_LABEL = {
  pending: { label: "Pending", color: "var(--warn)" },
  in_progress: { label: "In Progress", color: "var(--accent2)" },
  completed: { label: "Completed", color: "var(--accent)" },
};

export function isOverdue(task) {
  if (task.status === "completed") return false;
  return task.expected_delivery_date < todayISODate();
}

export function todayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function assigneeNames(task) {
  const names = (task.assignees || []).map((a) => a.member?.name || a.member?.email).filter(Boolean);
  return names.length ? names.join(", ") : "Unassigned";
}
