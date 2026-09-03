import { supabase } from "./supabaseClient";

export async function draftClientNote(reportBody) {
  const { data, error } = await supabase.functions.invoke("draft-client-note", {
    body: { body: reportBody },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.note;
}
