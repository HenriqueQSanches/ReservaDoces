import {
  assinaturaValida,
  consultarPagamento,
  pagamentoConfigurado,
  pagamentoVale,
  registrarPagamento,
} from "@/lib/mercadopago";

// Aviso automático do Mercado Pago. Só confia no aviso depois de conferir a assinatura
// e consultar o pagamento direto na API; o corpo do aviso sozinho não marca nada como pago.
export async function POST(request: Request) {
  if (!pagamentoConfigurado()) return new Response(null, { status: 404 });

  const url = new URL(request.url);
  const corpo = (await request.json().catch(() => null)) as
    | { type?: string; action?: string; data?: { id?: string | number } }
    | null;
  const dataId = url.searchParams.get("data.id") ?? (corpo?.data?.id != null ? String(corpo.data.id) : null);

  if (!assinaturaValida(request.headers, dataId)) {
    console.warn("webhook: assinatura inválida");
    return new Response(null, { status: 401 });
  }

  // Só pagamentos interessam; outros avisos (merchant_order etc.) são confirmados e ignorados
  const tipo = corpo?.type ?? url.searchParams.get("type");
  if (tipo !== "payment" || !dataId) return new Response(null, { status: 200 });

  try {
    const pagamento = await consultarPagamento(dataId);
    if (!pagamento.numero || !(await pagamentoVale(pagamento, pagamento.numero))) {
      return new Response(null, { status: 200 });
    }

    await registrarPagamento(pagamento.numero, pagamento);
    return new Response(null, { status: 200 });
  } catch (e) {
    // 500 faz o Mercado Pago tentar de novo mais tarde
    console.error("webhook", e);
    return new Response(null, { status: 500 });
  }
}
