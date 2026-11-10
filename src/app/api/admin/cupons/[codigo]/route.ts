import { z } from "zod";
import { exigirAdmin } from "@/lib/admin";
import { bancoDeDados } from "@/lib/supabase";
import { esquemaMensagem } from "@/lib/cupons";

// Liga ou desliga um cupom (ex.: se vazar), muda a porcentagem ou a mensagem.
// Pedidos já pagos guardam o desconto da época.
const esquema = z
  .object({
    ativo: z.boolean().optional(),
    percentual: z.number().int().min(1).max(90).optional(),
    mensagem: esquemaMensagem,
  })
  .refine((d) => d.ativo !== undefined || d.percentual !== undefined || d.mensagem !== undefined);

export async function POST(request: Request, ctx: RouteContext<"/api/admin/cupons/[codigo]">) {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;
  const { codigo } = await ctx.params;
  const corpo = esquema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "invalido" }, { status: 400 });

  const { data, error } = await bancoDeDados()
    .from("cupons")
    .update(corpo.data)
    .eq("codigo", codigo)
    .select("codigo")
    .maybeSingle();
  if (error) {
    console.error("admin: mudar cupom", error);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }
  if (!data) return Response.json({ erro: "nao_encontrado" }, { status: 404 });
  return Response.json({ ok: true });
}
