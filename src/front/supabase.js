import { createClient } from '@supabase/supabase-js'

// Import environment variables.
// Use import.meta.env for Vite projects.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase: Faltan llaves de configuración en el archivo .env. Asegúrate de añadir VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
}

// Create and export the Supabase client.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
