import { z } from "zod";
import { valorDaOpcao } from "@/config/campanha";
import { bancoDeDados } from "@/lib/supabase";
import { criarCobranca, pagamentoConfigurado } from "@/lib/mercadopago";

// A cliente escolhe quanto pagar agora; o valor sai do total gravado no pedido, nunca do navegador
const esquema = z.object({ opcao: z.enum(["sinal", "metade", "total"]).default("sinal") });

export type RespostaPagamento =
  | { ok: true; url: string }
  | { ok: false; motivo: "nao_encontrado" | "expirado" | "ja_pago" | "erro" };

// Gera o link de pagamento (sinal, metade ou tudo) para um pedido pendente e manda a cliente para o Mercado Pago.
export async function POST(request: Request, ctx: RouteContext<"/api/pedidos/[numero]/pagamento">) {
  const { numero } = await ctx.params;
  const corpo = esquema.safeParse(await request.json().catch(() => ({})));
  if (!corpo.success) return resposta({ ok: false, motivo: "erro" }, 400);
  const { opcao } = corpo.data;
  const banco = bancoDeDados();

  const { data: pedido, error } = await banco
    .from("pedidos")
    .select("numero, nome, status, total_centavos, sinal_centavos, expira_em")
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

  const valorCentavos = Math.max(pedido.sinal_centavos, valorDaOpcao(opcao, pedido.total_centavos));

  // Sem Mercado Pago configurado, só no desenvolvimento: confirma na hora para testar as telas
  if (!pagamentoConfigurado()) {
    if (process.env.NODE_ENV === "production") {
      console.error("pagamento: MP_ACCESS_TOKEN ausente em produção");
      return resposta({ ok: false, motivo: "erro" }, 500);
    }
    await banco.rpc("confirmar_pagamento", {
      p_numero: numero,
      p_pagamento_id: "simulado",
    });
    await banco.from("pedidos").update({ pago_centavos: valorCentavos }).eq("numero", numero);
    return resposta({ ok: true, url: `/pedido/${numero}` }, 200);
  }

  try {
    const { preferenciaId, url } = await criarCobranca({
      numero: pedido.numero,
      nome: pedido.nome,
      valorCentavos,
      opcao,
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
