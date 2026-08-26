import { supabase } from "../supabaseClient";
import { createTesterAuthUser } from "./adminUserClient";

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---- Testers (fullstack admin) ----

export async function listTesters() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("department", "fullstack")
    .eq("role", "tester")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addTester(email, password) {
  const user = await createTesterAuthUser(email, password);
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, email, department: "fullstack", role: "tester" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setTesterBlocked(id, blocked) {
  const { error } = await supabase.from("profiles").update({ blocked }).eq("id", id);
  if (error) throw error;
}

export async function removeTester(id) {
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

// ---- Checklist groups & items (fullstack admin, "Global Settings") ----

export async function listGroups() {
  const { data, error } = await supabase
    .from("checklist_groups")
    .select("*, checklist_items(id)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createGroup(name) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("checklist_groups")
    .insert({ name, created_by: auth.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameGroup(id, name) {
  const { error } = await supabase.from("checklist_groups").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteGroup(id) {
  const { error } = await supabase.from("checklist_groups").delete().eq("id", id);
  if (error) throw error;
}

export async function listGroupItems(groupId) {
  const { data, error } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("group_id", groupId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addChecklistItem(groupId, label, sortOrder) {
  const { data, error } = await supabase
    .from("checklist_items")
    .insert({ group_id: groupId, label, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateChecklistItem(id, label) {
  const { error } = await supabase.from("checklist_items").update({ label }).eq("id", id);
  if (error) throw error;
}

export async function deleteChecklistItem(id) {
  const { error } = await supabase.from("checklist_items").delete().eq("id", id);
  if (error) throw error;
}

// ---- Tasks (fullstack admin) ----

const TASK_LIST_SELECT =
  "*, assignees:task_assignees(tester:profiles(id,email)), group:checklist_groups(name), task_items(checked)";

export async function listTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_LIST_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listTrashedTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_LIST_SELECT)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function trashTask(id) {
  const { error } = await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function restoreTask(id) {
  const { error } = await supabase.from("tasks").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

export async function permanentlyDeleteTask(id) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function addTaskAssignee(taskId, testerId) {
  const { error } = await supabase.from("task_assignees").insert({ task_id: taskId, tester_id: testerId });
  if (error) throw error;
}

export async function removeTaskAssignee(taskId, testerId) {
  const { error } = await supabase.from("task_assignees").delete().eq("task_id", taskId).eq("tester_id", testerId);
  if (error) throw error;
}

export async function createTask({ name, groupId, assigneeIds }) {
  const { data: auth } = await supabase.auth.getUser();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({ name, group_id: groupId, created_by: auth.user.id })
    .select()
    .single();
  if (error) throw error;

  if (assigneeIds.length > 0) {
    const { error: assigneesError } = await supabase.from("task_assignees").insert(
      assigneeIds.map((testerId) => ({ task_id: task.id, tester_id: testerId }))
    );
    if (assigneesError) throw assigneesError;
  }

  const items = await listGroupItems(groupId);
  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("task_items").insert(
      items.map((it, i) => ({ task_id: task.id, label: it.label, sort_order: i }))
    );
    if (itemsError) throw itemsError;
  }
  return task;
}

export async function getTaskWithItems(taskId) {
  const { data: task, error } = await supabase
    .from("tasks")
    .select("*, assignees:task_assignees(tester:profiles(id,email)), group:checklist_groups(name)")
    .eq("id", taskId)
    .single();
  if (error) throw error;

  const { data: items, error: itemsError } = await supabase
    .from("task_items")
    .select("*, updated_by_profile:profiles!task_items_updated_by_fkey(email)")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: true });
  if (itemsError) throw itemsError;

  return { ...task, items };
}

// ---- Tester ----

export async function listMyTasks(userId) {
  const { data, error } = await supabase
    .from("task_assignees")
    .select("task:tasks(*, group:checklist_groups(name), task_items(checked))")
    .eq("tester_id", userId)
    .order("assigned_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => row.task).filter(Boolean).filter((t) => !t.deleted_at);
}

export async function updateTaskItem(itemId, fields) {
  const { error } = await supabase.from("task_items").update(fields).eq("id", itemId);
  if (error) throw error;
}

export async function updateTaskNote(taskId, note) {
  const { error } = await supabase.rpc("update_task_note", { p_task_id: taskId, p_note: note });
  if (error) throw error;
}

export async function uploadEvidenceImage(taskId, itemId, file) {
  const path = `${taskId}/${itemId}-${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("task-evidence").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("task-evidence").getPublicUrl(path);
  return data.publicUrl;
}

export async function submitTask(taskId) {
  const { error } = await supabase.rpc("submit_task", { p_task_id: taskId });
  if (error) throw error;
}

// ---- Shared ----

export function assigneeEmails(task) {
  const emails = (task.assignees || []).map((a) => a.tester?.email).filter(Boolean);
  return emails.length ? emails.join(", ") : "Unassigned";
}

export function taskStatus(task) {
  const items = task.task_items || task.items || [];
  const allChecked = items.length > 0 && items.every((it) => it.checked);
  if (task.submitted_at && allChecked) return "completed";
  if (items.some((it) => it.checked)) return "in_progress";
  return "pending";
}

export const TASK_STATUS_LABEL = {
  pending: { label: "Pending", color: "var(--warn)" },
  in_progress: { label: "In Progress", color: "var(--accent2)" },
  completed: { label: "Completed", color: "var(--accent)" },
};

export function buildReportText(task, generatedAt) {
  const items = task.items || task.task_items || [];
  const status = TASK_STATUS_LABEL[taskStatus(task)].label;
  const assignees = (task.assignees || []).map((a) => a.tester?.email).filter(Boolean);
  const lines = [];

  lines.push(task.name);
  lines.push(`Date: ${generatedAt.toLocaleDateString()}`);
  lines.push(`Status: ${status}`);
  if (task.group?.name) lines.push(`Checklist Group: ${task.group.name}`);
  if (assignees.length) lines.push(`Assigned to: ${assignees.join(", ")}`);
  if (task.submitted_at) lines.push(`Submitted: ${new Date(task.submitted_at).toLocaleString()}`);
  lines.push("");
  lines.push("Checklist:");
  items.forEach((item, i) => {
    lines.push(`${i + 1}. [${item.checked ? "x" : " "}] ${item.label}`);
    if (item.comment) lines.push(`   Comment: ${item.comment}`);
    if (item.updated_by_profile?.email) lines.push(`   By: ${item.updated_by_profile.email}`);
  });

  if (task.additional_note?.trim()) {
    lines.push("");
    lines.push("Additional Note:");
    lines.push(task.additional_note.trim());
  }

  return lines.join("\n");
}
