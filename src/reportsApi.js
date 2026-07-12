import { supabase } from "./supabaseClient";

const TABLE = "maintenance_reports";

export async function listReports() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, report_date, status, data, updated_at, client_report_status")
    .order("report_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getReport(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function saveReport({ id, report_date, status, data }) {
  const payload = { report_date, status, data };
  const query = id
    ? supabase.from(TABLE).update(payload).eq("id", id)
    : supabase.from(TABLE).insert(payload);
  const { data: row, error } = await query.select().single();
  if (error) throw error;
  return row;
}

export async function saveClientReport({ id, client_top_note, client_bottom_note, client_report_status }) {
  const { data: row, error } = await supabase
    .from(TABLE)
    .update({ client_top_note, client_bottom_note, client_report_status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row;
}

export async function deleteReport(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
