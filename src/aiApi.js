import { supabase } from "./supabaseClient";

export async function draftClientNote(reportBody) {
  const { data, error } = await supabase.functions.invoke("draft-client-note", {
    body: { body: reportBody },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.note;
}

export async function rewriteNotes(text) {
  const { data, error } = await supabase.functions.invoke("rewrite-notes", {
    body: { text },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.text;
}

export async function generateText(prompt) {
  const { data, error } = await supabase.functions.invoke("generate-text", {
    body: { prompt },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.text;
}
