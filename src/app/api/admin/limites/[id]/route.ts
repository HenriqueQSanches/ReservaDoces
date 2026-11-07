import { z } from "zod";
import { exigirAdmin } from "@/lib/admin";
import { bancoDeDados } from "@/lib/supabase";

// O Luiz muda os números de um bloco. As datas do bloco não mudam por aqui.
const esquema = z.object({
  limite_dia: z.number().int().min(0).max(1000),
  limite_total: z.number().int().min(0).max(5000).nullable(),
});

export async function POST(request: Request, ctx: RouteContext<"/api/admin/limites/[id]">) {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;

  const { id } = await ctx.params;
  const corpo = esquema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "invalido" }, { status: 400 });

  const { data, error } = await bancoDeDados()
    .from("limites")
    .update(corpo.data)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("admin: mudar limite", error);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }
  if (!data) return Response.json({ erro: "nao_encontrado" }, { status: 404 });
  return Response.json({ ok: true });
}
