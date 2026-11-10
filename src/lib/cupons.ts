import "server-only";
import { z } from "zod";
import { normalizarCupom } from "@/config/campanha";
import { bancoDeDados } from "@/lib/supabase";

// mensagem: texto da tela de resumo com {nome} no lugar do primeiro nome (null = só o aviso de aplicado)
// Mensagem opcional da tela de resumo, escrita no painel; vazia vira null
export const esquemaMensagem = z
  .string()
  .trim()
  .max(200)
  .transform((t) => t || null)
  .nullish();

export type Cupom = { codigo: string; percentual: number; mensagem: string | null };

// Cupom ativo com esse código, ou null. Quem confere se a pessoa tinha direito é o Luiz, na cobrança final.
export async function buscarCupomAtivo(texto: string): Promise<Cupom | null> {
  const codigo = normalizarCupom(texto);
  if (!/^[A-Z0-9]{3,20}$/.test(codigo)) return null;
  const { data, error } = await bancoDeDados()
    .from("cupons")
    .select("codigo, percentual, mensagem")
    .eq("codigo", codigo)
    .eq("ativo", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
