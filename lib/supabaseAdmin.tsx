// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const supabaseAdminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // NOTE: no NEXT_PUBLIC

export const supabaseAdmin = createClient(
  supabaseAdminUrl,
  supabaseServiceRoleKey
);
