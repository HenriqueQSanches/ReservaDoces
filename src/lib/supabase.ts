import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente do banco com a chave secreta. Só existe no servidor: o navegador nunca vê a chave.
export function bancoDeDados() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !chave) throw new Error("SUPABASE_URL e SUPABASE_SECRET_KEY precisam estar no .env.local");

  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
