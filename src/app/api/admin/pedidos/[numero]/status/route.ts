import { z } from "zod";
import { exigirAdmin } from "@/lib/admin";
import { bancoDeDados } from "@/lib/supabase";

// Mudanças que o Luiz pode fazer à mão. Cancelar um pedido pago libera a vaga (o sinal é devolvido por fora).
const permitidas: Record<string, string[]> = {
  pago: ["entregue", "cancelado"],
  entregue: ["pago"],
  estornar: ["cancelado"],
  pendente: ["cancelado"],
};

const esquema = z.object({ status: z.enum(["entregue", "cancelado", "pago"]) });

export async function POST(request: Request, ctx: RouteContext<"/api/admin/pedidos/[numero]/status">) {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;

  const { numero } = await ctx.params;
  const corpo = esquema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "invalido" }, { status: 400 });

  const banco = bancoDeDados();
  const { data: pedido } = await banco.from("pedidos").select("status").eq("numero", numero).maybeSingle();
  if (!pedido) return Response.json({ erro: "nao_encontrado" }, { status: 404 });
  if (!permitidas[pedido.status]?.includes(corpo.data.status))
    return Response.json({ erro: "mudanca_nao_permitida" }, { status: 409 });

  // Só altera se o status ainda for o mesmo lido acima (evita corrida com o webhook)
  const { data, error } = await banco
    .from("pedidos")
    .update({ status: corpo.data.status })
    .eq("numero", numero)
    .eq("status", pedido.status)
    .select("status")
    .maybeSingle();
  if (error) {
    console.error("admin: mudar status", error);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }
  if (!data) return Response.json({ erro: "mudou_no_meio" }, { status: 409 });
  return Response.json({ status: data.status });
}
