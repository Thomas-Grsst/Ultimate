// ============================================================
//  CONFIGURATION SUPABASE
//  Supabase Dashboard > Project Settings > API
//    - Project URL                    -> SUPABASE_URL
//    - Project API keys: "anon" "public" -> SUPABASE_ANON_KEY
//
//  ⚠️ Utilise UNIQUEMENT la clé "anon public".
//     N'utilise JAMAIS la clé "service_role" ici : elle est secrète,
//     contourne la sécurité RLS et donnerait un accès admin total
//     à n'importe quel visiteur du site.
// ============================================================

export const SUPABASE_URL = "https://qwsivuarmdatontbauea.supabase.co";

// Clé "anon public" (sans danger côté navigateur, RLS protège les données).
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3c2l2dWFybWRhdG9udGJhdWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDU2NDAsImV4cCI6MjA5ODIyMTY0MH0.LbSIQomaQKJodsqNPsvwHANxzng2h10WxbI_o479TXQ";

// Activé automatiquement une fois l'URL et la clé anon renseignées.
export const SUPABASE_ENABLED =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("VOTRE-PROJET") &&
  SUPABASE_ANON_KEY.length > 40 &&
  !SUPABASE_ANON_KEY.includes("COLLE_TA_CLE");
