import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "No se pudo configurar la conexión con la base de datos."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);