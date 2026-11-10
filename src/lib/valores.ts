// Contas de valor de um pedido, usadas no painel e na planilha (roda no navegador e no servidor)
// total_centavos é o preço cheio; desconto_centavos vem do cupom (0 sem cupom)
type ValoresPedido = {
  total_centavos: number;
  sinal_centavos: number;
  pago_centavos: number | null;
  desconto_centavos: number;
};

// Quanto a cliente pagou: o valor do Mercado Pago (sinal, metade ou tudo), ou o sinal nos pedidos antigos e pendentes
export const pagoDoPedido = (p: ValoresPedido) => p.pago_centavos ?? p.sinal_centavos;

// Quanto falta receber na entrega ou retirada (já com o desconto do cupom)
export const faltaDoPedido = (p: ValoresPedido) =>
  Math.max(0, p.total_centavos - p.desconto_centavos - pagoDoPedido(p));

// O que devolver se ela desistir: só o que passou do sinal
export const devolverSeDesistir = (p: ValoresPedido) => Math.max(0, (p.pago_centavos ?? 0) - p.sinal_centavos);
