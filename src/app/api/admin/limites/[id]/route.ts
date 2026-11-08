import { z } from "zod";
import { exigirAdmin } from "@/lib/admin";
import { bancoDeDados } from "@/lib/supabase";

// O Luiz muda os números de um bloco e, se quiser, o limite de dias específicos.
// As datas do bloco não mudam por aqui.
const esquema = z.object({
  limite_dia: z.number().int().min(0).max(1000),
  limite_total: z.number().int().min(0).max(5000).nullable(),
  // { "2026-12-21": 4 } define o limite do dia; null volta o dia para o "por dia" do bloco
  dias: z
    .record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.number().int().min(0).max(1000).nullable())
    .optional(),
});

export async function POST(request: Request, ctx: RouteContext<"/api/admin/limites/[id]">) {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;

  const { id } = await ctx.params;
  const corpo = esquema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "invalido" }, { status: 400 });

  const banco = bancoDeDados();
  const { dias = {}, ...numeros } = corpo.data;

  const { data, error } = await banco.from("limites").select("datas").eq("id", id).maybeSingle();
  if (error) return falha("ler limite", error);
  if (!data) return Response.json({ erro: "nao_encontrado" }, { status: 404 });

  // Só aceita dias que são do bloco (confere antes de mudar qualquer coisa)
  const entradas = Object.entries(dias);
  if (entradas.some(([d]) => !(data.datas as string[]).includes(d))) {
    return Response.json({ erro: "invalido" }, { status: 400 });
  }

  const { error: eNumeros } = await banco.from("limites").update(numeros).eq("id", id);
  if (eNumeros) return falha("mudar limite", eNumeros);

  const definir = entradas.filter(([, v]) => v !== null).map(([d, v]) => ({ limite_id: id, data: d, limite: v as number, atualizado_em: new Date().toISOString() }));
  const voltar = entradas.filter(([, v]) => v === null).map(([d]) => d);

  if (definir.length > 0) {
    const { error: e } = await banco.from("limites_por_dia").upsert(definir);
    if (e) return falha("limite do dia", e);
  }
  if (voltar.length > 0) {
    const { error: e } = await banco.from("limites_por_dia").delete().eq("limite_id", id).in("data", voltar);
    if (e) return falha("voltar limite do dia", e);
  }
  return Response.json({ ok: true });
}

function falha(onde: string, erro: unknown) {
  console.error(`admin: ${onde}`, erro);
  return Response.json({ erro: "indisponivel" }, { status: 500 });
}
