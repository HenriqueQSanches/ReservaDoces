import { campanha } from "@/config/campanha";
import { bancoDeDados } from "@/lib/supabase";

// Só no desenvolvimento, até o Mercado Pago entrar: faz o papel da confirmação de pagamento.
// No site publicado esta rota não existe.
export async function POST(_request: Request, ctx: RouteContext<"/api/pedidos/[numero]/simular-pagamento">) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });

  const { numero } = await ctx.params;
  const { data, error } = await bancoDeDados().rpc("confirmar_pagamento", {
    p_numero: numero,
    p_pagamento_id: "simulado",
    p_limite_reservas: campanha.limiteReservas,
    p_limite_produtos: campanha.limiteProdutos,
  });

  if (error) {
    console.error("confirmar_pagamento", error);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }
  return Response.json(data);
}
