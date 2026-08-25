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
  "*, assigned:profiles!tasks_assigned_to_fkey(email), group:checklist_groups(name), task_items(checked)";

export async function listTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_LIST_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTask({ name, groupId, assignedTo }) {
  const { data: auth } = await supabase.auth.getUser();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({ name, group_id: groupId, assigned_to: assignedTo, created_by: auth.user.id })
    .select()
    .single();
  if (error) throw error;

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
    .select("*, assigned:profiles!tasks_assigned_to_fkey(email), group:checklist_groups(name)")
    .eq("id", taskId)
    .single();
  if (error) throw error;

  const { data: items, error: itemsError } = await supabase
    .from("task_items")
    .select("*")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: true });
  if (itemsError) throw itemsError;

  return { ...task, items };
}

// ---- Tester ----

export async function listMyTasks(userId) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, group:checklist_groups(name), task_items(checked)")
    .eq("assigned_to", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateTaskItem(itemId, fields) {
  const { error } = await supabase.from("task_items").update(fields).eq("id", itemId);
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

export function taskStatus(task) {
  if (task.submitted_at) return "completed";
  const items = task.task_items || task.items || [];
  if (items.some((it) => it.checked)) return "in_progress";
  return "pending";
}

export const TASK_STATUS_LABEL = {
  pending: { label: "Pending", color: "var(--warn)" },
  in_progress: { label: "In Progress", color: "var(--accent2)" },
  completed: { label: "Completed", color: "var(--accent)" },
};
