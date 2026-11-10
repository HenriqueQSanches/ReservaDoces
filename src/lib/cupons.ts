import "server-only";
import { normalizarCupom } from "@/config/campanha";
import { bancoDeDados } from "@/lib/supabase";

export type Cupom = { codigo: string; percentual: number };

// Cupom ativo com esse código, ou null. Quem confere se a pessoa tinha direito é o Luiz, na cobrança final.
export async function buscarCupomAtivo(texto: string): Promise<Cupom | null> {
  const codigo = normalizarCupom(texto);
  if (!/^[A-Z0-9]{3,20}$/.test(codigo)) return null;
  const { data, error } = await bancoDeDados()
    .from("cupons")
    .select("codigo, percentual")
    .eq("codigo", codigo)
    .eq("ativo", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
