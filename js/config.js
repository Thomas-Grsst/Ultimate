// ============================================================
//  CONFIGURATION SUPABASE
//  Remplace les deux valeurs ci-dessous par celles de TON projet :
//  Supabase Dashboard > Project Settings > Data API (ou API)
//    - Project URL          -> SUPABASE_URL
//    - Project API keys: anon public -> SUPABASE_ANON_KEY
//  La clé "anon" est PUBLIQUE, elle peut rester dans le code (RLS protège les données).
// ============================================================

export const SUPABASE_URL = "https://VOTRE-PROJET.supabase.co";
export const SUPABASE_ANON_KEY = "VOTRE_CLE_ANON_PUBLIQUE";

// Laisse à false tant que tu n'as pas renseigné les valeurs ci-dessus.
// Quand c'est rempli, passe à true pour activer la synchro Supabase.
export const SUPABASE_ENABLED =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("https://qwsivuarmdatontbauea.supabase.co") &&
  !SUPABASE_ANON_KEY.includes(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3c2l2dWFybWRhdG9udGJhdWVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY0NTY0MCwiZXhwIjoyMDk4MjIxNjQwfQ.YXyQH40kjln5vNAw2BNdaiHqGVsXtdP3J2qW7yj8bHI",
  );
