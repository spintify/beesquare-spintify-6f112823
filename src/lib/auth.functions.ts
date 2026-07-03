import { createServerFn } from "@tanstack/react-start";

// Client-callable sign-in. All credential constants live inside the handler,
// so nothing sensitive is bundled into the browser.
export const adminSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; password: string }) => {
    if (
      !input ||
      typeof input.userId !== "string" ||
      typeof input.password !== "string" ||
      input.userId.length > 200 ||
      input.password.length > 200
    ) {
      throw new Error("Invalid credentials payload");
    }
    return { userId: input.userId.trim(), password: input.password };
  })
  .handler(async ({ data }) => {
    const REQUIRED_USER_ID = process.env.ADMIN_USER_ID || "BEESQUAREBILLS";
    const REQUIRED_PASSWORD = process.env.ADMIN_PASSWORD || "BRIJESH1";
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "beesquarebills@bsenterprises.local";
    // Internal Supabase auth password (decoupled from the user-facing password)
    const SUPABASE_AUTH_PASSWORD =
      process.env.ADMIN_SUPABASE_PASSWORD || "bs-internal-" + (process.env.SUPABASE_PROJECT_ID || "x");

    if (
      data.userId.toUpperCase() !== REQUIRED_USER_ID.toUpperCase() ||
      data.password !== REQUIRED_PASSWORD
    ) {
      // Generic message; do not leak which field was wrong
      throw new Error("Invalid User ID or Password");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Idempotently ensure the underlying auth user exists
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw new Error(listErr.message);
    const existing = list.users.find((u) => u.email === ADMIN_EMAIL);
    if (!existing) {
      const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: SUPABASE_AUTH_PASSWORD,
        email_confirm: true,
      });
      if (createErr) throw new Error(createErr.message);
    } else {
      // Make sure the internal password matches what we will sign in with
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: SUPABASE_AUTH_PASSWORD,
      });
    }

    // Server-side sign-in to obtain a session for the validated admin
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const tmp = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: signIn, error: signErr } = await tmp.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: SUPABASE_AUTH_PASSWORD,
    });
    if (signErr || !signIn.session) throw new Error(signErr?.message || "Sign-in failed");

    return {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    };
  });
