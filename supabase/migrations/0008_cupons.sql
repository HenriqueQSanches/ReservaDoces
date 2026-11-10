-- Cupom de desconto (pedido do Luiz, 10/11/2026).
-- Um código que o Luiz manda no WhatsApp para quem comprou na Páscoa. Sem cadastro prévio: quem digitar
-- um código ativo ganha o desconto, e o Luiz confere a elegibilidade na hora de cobrar o restante.
-- O sinal continua sobre o preço cheio; o desconto sai do valor final.

create table public.cupons (
  -- sempre em maiúsculas, sem espaços
  codigo text primary key check (codigo = upper(codigo) and codigo ~ '^[A-Z0-9]{3,20}$'),
  percentual integer not null check (percentual between 1 and 90),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.cupons enable row level security;
revoke all on table public.cupons from anon, authenticated;
grant select, insert, update on table public.cupons to service_role;

insert into public.cupons (codigo, percentual) values ('NATAL15', 15);

-- O pedido guarda o cupom e o desconto em reais do momento do pagamento.
-- total_centavos continua sendo o preço cheio; o valor final é total_centavos - desconto_centavos.
alter table public.pedidos
  add column cupom_codigo text,
  add column desconto_centavos integer not null default 0 check (desconto_centavos >= 0);
