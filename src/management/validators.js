export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim());
}

export function isValidUrl(url) {
  if (!url || !url.trim()) return true; // optional field
  try { new URL(url); return true; } catch { return false; }
}

// Translates a Supabase/PostgREST error into a clean, user-facing message.
// Never lets a raw SQLSTATE/constraint name reach the UI.
export function friendlyDbError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (error.code === "23505") {
    if (error.message?.includes("email")) return "This email address is already registered. Please use a different email address.";
    return "This record already exists.";
  }
  if (error.code === "23514") return "One of the values entered isn't valid. Please check the form and try again.";
  if (error.code === "23503") return "This record is linked to other data and can't be changed that way.";
  return error.message || fallback;
}
