// Contas de valor de um pedido, usadas no painel e na planilha (roda no navegador e no servidor)
type ValoresPedido = { total_centavos: number; sinal_centavos: number; pago_centavos: number | null };

// Quanto a cliente pagou: o valor do Mercado Pago (sinal, metade ou tudo), ou o sinal nos pedidos antigos e pendentes
export const pagoDoPedido = (p: ValoresPedido) => p.pago_centavos ?? p.sinal_centavos;

// Quanto falta receber na entrega ou retirada
export const faltaDoPedido = (p: ValoresPedido) => Math.max(0, p.total_centavos - pagoDoPedido(p));

// O que devolver se ela desistir: só o que passou do sinal
export const devolverSeDesistir = (p: ValoresPedido) => Math.max(0, (p.pago_centavos ?? 0) - p.sinal_centavos);
