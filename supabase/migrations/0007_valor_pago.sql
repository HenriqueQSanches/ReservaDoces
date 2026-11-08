-- Quanto a cliente pagou de verdade no Mercado Pago (08/11/2026).
-- Ela pode pagar só o sinal, metade ou tudo; sinal_centavos continua sendo o mínimo do pedido.
-- Se desistir, o sinal fica com a loja e o que passou dele é devolvido.
-- Pedidos antigos ficam com null (pagaram só o sinal).

alter table public.pedidos
  add column pago_centavos integer check (pago_centavos >= 0);
