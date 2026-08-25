import { createClient } from "@supabase/supabase-js";

// A throwaway Supabase client used only to sign up new tester accounts.
// persistSession: false keeps it out of localStorage entirely, and a distinct
// storageKey keeps it from ever colliding with the main `supabase` client in
// supabaseClient.js, so calling auth.signUp() here never disturbs the admin's
// own session. Built lazily (only when an admin actually adds a tester)
// instead of at module load, so every other visitor never pays for a second
// GoTrue client.
let client = null;
function getAdminUserClient() {
  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: "sb-admin-user-creation-scratch",
        },
      }
    );
  }
  return client;
}

export async function createTesterAuthUser(email, password) {
  const { data, error } = await getAdminUserClient().auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error("Sign up did not return a user.");
  return data.user;
}
