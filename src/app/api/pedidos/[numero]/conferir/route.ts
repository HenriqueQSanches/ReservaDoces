import { z } from "zod";
import { bancoDeDados } from "@/lib/supabase";
import { consultarPagamento, pagamentoConfigurado, pagamentoVale } from "@/lib/mercadopago";

const esquema = z.object({ pagamentoId: z.string().regex(/^\d{1,20}$/) });

// Quando a cliente volta do Mercado Pago, o site confere o pagamento direto lá.
// Cobre o caso de o aviso automático ainda não ter chegado (ou não existir, no computador local).
export async function POST(request: Request, ctx: RouteContext<"/api/pedidos/[numero]/conferir">) {
  const { numero } = await ctx.params;
  const corpo = esquema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "dados_invalidos" }, { status: 400 });
  if (!pagamentoConfigurado()) return Response.json({ erro: "nao_configurado" }, { status: 404 });

  try {
    const pagamento = await consultarPagamento(corpo.data.pagamentoId);
    if (!pagamentoVale(pagamento, numero)) {
      return Response.json({ status_mp: pagamento.status, confirmado: false });
    }

    const { data, error } = await bancoDeDados().rpc("confirmar_pagamento", {
      p_numero: numero,
      p_pagamento_id: pagamento.id,
    });
    if (error) throw error;
    return Response.json({ status_mp: pagamento.status, confirmado: data.ok === true, status: data.status });
  } catch (e) {
    console.error("conferir pagamento", e);
    return Response.json({ erro: "indisponivel" }, { status: 502 });
  }
}
