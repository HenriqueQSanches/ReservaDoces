import { exigirAdmin } from "@/lib/admin";
import { bancoDeDados } from "@/lib/supabase";
import { buscarPagamentoDoPedido, pagamentoConfigurado, pagamentoVale, registrarPagamento } from "@/lib/mercadopago";

export type RespostaConferir =
  | { resultado: "confirmado"; status: string; valorCentavos: number }
  | { resultado: "ja_registrado"; status: string }
  | { resultado: "sem_pagamento" }
  | { resultado: "nao_aprovado"; statusMp: string };

// Botão "Conferir no Mercado Pago" do painel: procura o pagamento pelo número do pedido e, se estiver
// aprovado lá, marca aqui. Cobre o caso raro de o aviso automático falhar e a cliente não voltar ao site.
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/pedidos/[numero]/conferir">) {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;
  if (!pagamentoConfigurado()) return Response.json({ erro: "nao_configurado" }, { status: 404 });

  const { numero } = await ctx.params;
  const { data: pedido, error } = await bancoDeDados()
    .from("pedidos")
    .select("status")
    .eq("numero", numero)
    .maybeSingle();
  if (error) return falha(error);
  if (!pedido) return Response.json({ erro: "nao_encontrado" }, { status: 404 });

  if (["pago", "entregue", "estornar"].includes(pedido.status)) {
    return resposta({ resultado: "ja_registrado", status: pedido.status });
  }

  try {
    const pagamento = await buscarPagamentoDoPedido(numero);
    if (!pagamento) return resposta({ resultado: "sem_pagamento" });
    if (!(await pagamentoVale(pagamento, numero))) return resposta({ resultado: "nao_aprovado", statusMp: pagamento.status });

    const confirmado = await registrarPagamento(numero, pagamento);
    return resposta({ resultado: "confirmado", status: confirmado.status ?? "pago", valorCentavos: pagamento.valorCentavos });
  } catch (e) {
    return falha(e);
  }
}

function resposta(corpo: RespostaConferir) {
  return Response.json(corpo);
}

function falha(erro: unknown) {
  console.error("admin: conferir no Mercado Pago", erro);
  return Response.json({ erro: "indisponivel" }, { status: 502 });
}
