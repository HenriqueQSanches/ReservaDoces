import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import type { OpcaoPagamento } from "@/config/campanha";
import { bancoDeDados } from "@/lib/supabase";

// Tudo aqui roda só no servidor: o token nunca chega ao navegador.

export function pagamentoConfigurado() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

function cliente() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN precisa estar no .env.local");
  return new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
}

// Endereço público do site: a Netlify define URL no build; local cai no localhost
export function enderecoDoSite() {
  return (process.env.URL ?? "http://localhost:3000").replace(/\/$/, "");
}

type Cobranca = {
  numero: string;
  nome: string;
  valorCentavos: number;
  opcao: OpcaoPagamento;
  expiraEm: string;
};

// Cria a cobrança no Mercado Pago (Checkout Pro) e devolve o link de pagamento.
// O valor é o da opção escolhida (sinal, metade ou tudo), calculado no servidor.
// Pix, crédito e débito; sem boleto (demora dias) e sem parcelamento.
export async function criarCobranca({ numero, nome, valorCentavos, opcao, expiraEm }: Cobranca) {
  const titulo = opcao === "sinal" ? `Sinal da reserva ${numero}` : `Reserva ${numero} (${opcao === "total" ? "valor total" : "metade"})`;
  const site = enderecoDoSite();
  const volta = `${site}/pedido/${numero}`;
  const seguro = site.startsWith("https://");

  const preferencia = await new Preference(cliente()).create({
    body: {
      items: [
        {
          id: numero,
          title: titulo,
          description: "Reserva de Natal",
          quantity: 1,
          unit_price: valorCentavos / 100,
          currency_id: "BRL",
        },
      ],
      payer: { name: nome },
      external_reference: numero,
      back_urls: { success: volta, pending: volta, failure: volta },
      // O retorno automático só é aceito com endereço https
      ...(seguro ? { auto_return: "approved" } : {}),
      // Sem notification_url: o aviso vem pelo webhook configurado no painel do Mercado Pago (com assinatura).
      // Com o campo, o MP também mandava avisos no formato antigo (IPN), sem assinatura, que o site recusa.
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }],
        installments: 1,
      },
      // A cobrança vence junto com a vaga
      expires: true,
      expiration_date_to: expiraEm,
      date_of_expiration: expiraEm,
      binary_mode: false,
      metadata: { numero, opcao, valor_centavos: valorCentavos, campanha: "natal" },
    },
    requestOptions: { idempotencyKey: `preferencia-${numero}-${opcao}-${expiraEm}` },
  });

  if (!preferencia.id || !preferencia.init_point) throw new Error("Mercado Pago não devolveu o link de pagamento");
  return { preferenciaId: preferencia.id, url: preferencia.init_point };
}

export type PagamentoMP = {
  id: string;
  status: string;
  numero: string | null;
  valorCentavos: number;
};

// Consulta um pagamento direto no Mercado Pago. É a única fonte que vale para marcar como pago.
export async function consultarPagamento(id: string): Promise<PagamentoMP> {
  const p = await new Payment(cliente()).get({ id });
  return {
    id: String(p.id),
    status: p.status ?? "desconhecido",
    numero: p.external_reference ?? null,
    valorCentavos: Math.round((p.transaction_amount ?? 0) * 100),
  };
}

// Pagamento aprovado e do valor certo: pelo menos o sinal gravado no próprio pedido (varia com o total)
export async function pagamentoVale(p: PagamentoMP, numero: string) {
  if (p.status !== "approved" || p.numero !== numero) return false;
  const { data } = await bancoDeDados().from("pedidos").select("sinal_centavos").eq("numero", numero).maybeSingle();
  return data != null && p.valorCentavos >= data.sinal_centavos;
}

// Confere a assinatura que o Mercado Pago manda em cada aviso (x-signature).
// Manifesto: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" assinado com HMAC-SHA256 e a chave secreta.
export function assinaturaValida(cabecalhos: Headers, dataId: string | null) {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  const assinatura = cabecalhos.get("x-signature");
  const requestId = cabecalhos.get("x-request-id");
  if (!segredo || !assinatura || !requestId || !dataId) return false;

  const partes = Object.fromEntries(
    assinatura.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  );
  if (!partes.ts || !partes.v1) return false;

  // Aviso com mais de 10 minutos não vale, mesmo com assinatura certa
  const idade = Date.now() / 1000 - Number(partes.ts);
  if (!Number.isFinite(idade) || Math.abs(idade) > 600) return false;

  const idNormalizado = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifesto = `id:${idNormalizado};request-id:${requestId};ts:${partes.ts};`;
  const esperado = createHmac("sha256", segredo).update(manifesto).digest("hex");

  const a = Buffer.from(esperado);
  const b = Buffer.from(partes.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Marca o pedido como pago (ou "estornar", se chegou tarde sem vaga) e guarda quanto foi pago de verdade
export async function registrarPagamento(numero: string, pagamento: PagamentoMP) {
  const banco = bancoDeDados();
  const { data, error } = await banco.rpc("confirmar_pagamento", { p_numero: numero, p_pagamento_id: pagamento.id });
  if (error) throw error;
  const { error: e2 } = await banco
    .from("pedidos")
    .update({ pago_centavos: pagamento.valorCentavos })
    .eq("numero", numero)
    .eq("mp_pagamento_id", pagamento.id);
  if (e2) throw e2;
  return data as { ok: boolean; status?: string };
}

// Rede de segurança: procura no Mercado Pago os pagamentos de um pedido pelo número (external_reference).
// Serve quando o aviso automático não chegou e a cliente não voltou ao site. Devolve o aprovado, se houver,
// senão o mais recente, para o painel mostrar o que o Mercado Pago tem.
export async function buscarPagamentoDoPedido(numero: string): Promise<PagamentoMP | null> {
  const busca = await new Payment(cliente()).search({
    options: { external_reference: numero, sort: "date_created", criteria: "desc" },
  });
  const pagamentos: PagamentoMP[] = (busca.results ?? []).map((p) => ({
    id: String(p.id),
    status: p.status ?? "desconhecido",
    numero: p.external_reference ?? null,
    valorCentavos: Math.round((p.transaction_amount ?? 0) * 100),
  }));
  const doPedido = pagamentos.filter((p) => p.numero === numero);
  return doPedido.find((p) => p.status === "approved") ?? doPedido[0] ?? null;
}
