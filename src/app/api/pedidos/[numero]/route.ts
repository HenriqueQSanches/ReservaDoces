import { bancoDeDados } from "@/lib/supabase";

export type StatusPedido = "pendente" | "pago" | "expirado" | "estornar" | "cancelado" | "entregue";

// Devolve só o status: o número do pedido é sequencial, então nada de dados da cliente aqui.
export async function GET(_request: Request, ctx: RouteContext<"/api/pedidos/[numero]">) {
  const { numero } = await ctx.params;

  const { data, error } = await bancoDeDados()
    .from("pedidos")
    .select("status, expira_em")
    .eq("numero", numero)
    .maybeSingle();

  if (error) {
    console.error("status do pedido", error);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }
  if (!data) return Response.json({ erro: "nao_encontrado" }, { status: 404 });

  const status = data.status === "pendente" && new Date(data.expira_em) < new Date() ? "expirado" : data.status;
  return Response.json({ status: status as StatusPedido }, { headers: { "Cache-Control": "no-store" } });
}
