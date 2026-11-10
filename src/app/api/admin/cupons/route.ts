import { z } from "zod";
import { normalizarCupom } from "@/config/campanha";
import { exigirAdmin } from "@/lib/admin";
import { bancoDeDados } from "@/lib/supabase";
import { esquemaMensagem } from "@/lib/cupons";

export type CupomAdmin = {
  codigo: string;
  percentual: number;
  ativo: boolean;
  mensagem: string | null;
  criado_em: string;
};


export async function GET() {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;
  const { data, error } = await bancoDeDados().from("cupons").select("*").order("criado_em");
  if (error) return falha("listar cupons", error);
  return Response.json({ cupons: data as CupomAdmin[] }, { headers: { "Cache-Control": "no-store" } });
}

// O Luiz cria um código novo (ex.: VIP10 com 10%)
const esquema = z.object({
  codigo: z.string().transform(normalizarCupom).pipe(z.string().regex(/^[A-Z0-9]{3,20}$/)),
  percentual: z.number().int().min(1).max(90),
  mensagem: esquemaMensagem,
});

export async function POST(request: Request) {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;
  const corpo = esquema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "invalido" }, { status: 400 });
  const { error } = await bancoDeDados().from("cupons").insert(corpo.data);
  // 23505: já existe um cupom com esse código
  if (error?.code === "23505") return Response.json({ erro: "ja_existe" }, { status: 409 });
  if (error) return falha("criar cupom", error);
  return Response.json({ ok: true });
}

function falha(onde: string, erro: unknown) {
  console.error(`admin: ${onde}`, erro);
  return Response.json({ erro: "indisponivel" }, { status: 500 });
}
