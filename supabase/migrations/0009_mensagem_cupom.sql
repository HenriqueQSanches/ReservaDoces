-- Mensagem do cupom (pedido da Nathalia, 10/11/2026).
-- Aparece na tela de resumo quando o cupom é aceito, com {nome} trocado pelo primeiro nome da cliente.
-- Ex.: "Parabéns, {nome}! Sabia que você voltaria. Você é um cliente especial pra gente."
-- Sem mensagem, a tela mostra só o aviso de cupom aplicado.

alter table public.cupons
  add column mensagem text check (char_length(mensagem) <= 200);
