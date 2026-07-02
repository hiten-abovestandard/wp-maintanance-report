import { supabase } from "./supabaseClient";

const TABLE = "maintenance_reports";

export async function listReports() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, report_date, status, data, updated_at")
    .order("report_date", { ascending: false });
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

export async function deleteReport(id) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
