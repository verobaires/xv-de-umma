import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase para "Los XV de Umma — El Arte de Leer".
// El proyecto de Supabase ya existe (no crear uno nuevo).
// Supabase maneja TODO el backend: base de datos, auth y lógica de negocio.
// Este proyecto (Lovable) maneja SOLO el frontend (React + Vite + React Router DOM).

export const supabaseUrl = "https://lyesyoofgicfezabtnns.supabase.co";

export const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5ZXN5b29mZ2ljZmV6YWJ0bm5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjE3OTAsImV4cCI6MjA5NDAzNzc5MH0.vCKVg7Uu7UqtVncVLgqN12JZxc9fRmnAezRuu_WXkRs";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
