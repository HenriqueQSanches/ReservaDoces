import { campanha } from "@/config/campanha";
import { bancoDeDados } from "@/lib/supabase";
import { criarCobranca, pagamentoConfigurado } from "@/lib/mercadopago";

export type RespostaPagamento =
  | { ok: true; url: string }
  | { ok: false; motivo: "nao_encontrado" | "expirado" | "ja_pago" | "erro" };

// Gera o link de pagamento do sinal para um pedido pendente e manda a cliente para o Mercado Pago.
export async function POST(_request: Request, ctx: RouteContext<"/api/pedidos/[numero]/pagamento">) {
  const { numero } = await ctx.params;
  const banco = bancoDeDados();

  const { data: pedido, error } = await banco
    .from("pedidos")
    .select("numero, nome, status, sinal_centavos, expira_em")
    .eq("numero", numero)
    .maybeSingle();

  if (error) {
    console.error("pagamento: ler pedido", error);
    return resposta({ ok: false, motivo: "erro" }, 500);
  }
  if (!pedido) return resposta({ ok: false, motivo: "nao_encontrado" }, 404);
  if (pedido.status === "pago" || pedido.status === "entregue") return resposta({ ok: false, motivo: "ja_pago" }, 409);
  if (pedido.status !== "pendente" || new Date(pedido.expira_em) < new Date())
    return resposta({ ok: false, motivo: "expirado" }, 409);

  // Sem Mercado Pago configurado, só no desenvolvimento: confirma na hora para testar as telas
  if (!pagamentoConfigurado()) {
    if (process.env.NODE_ENV === "production") {
      console.error("pagamento: MP_ACCESS_TOKEN ausente em produção");
      return resposta({ ok: false, motivo: "erro" }, 500);
    }
    await banco.rpc("confirmar_pagamento", {
      p_numero: numero,
      p_pagamento_id: "simulado",
      p_limite_reservas: campanha.limiteReservas,
      p_limite_produtos: campanha.limiteProdutos,
    });
    return resposta({ ok: true, url: `/pedido/${numero}` }, 200);
  }

  try {
    const { preferenciaId, url } = await criarCobranca({
      numero: pedido.numero,
      nome: pedido.nome,
      sinalCentavos: pedido.sinal_centavos,
      expiraEm: new Date(pedido.expira_em).toISOString(),
    });
    await banco.from("pedidos").update({ mp_preferencia_id: preferenciaId }).eq("numero", numero);
    return resposta({ ok: true, url }, 200);
  } catch (e) {
    console.error("pagamento: criar cobrança", e);
    return resposta({ ok: false, motivo: "erro" }, 502);
  }
}

function resposta(corpo: RespostaPagamento, status: number) {
  return Response.json(corpo, { status });
}
