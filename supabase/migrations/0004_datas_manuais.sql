-- Datas abertas ou fechadas à mão pelo Luiz no painel.
-- Sem linha aqui, vale o automático: a data fecha alguns dias antes (antecedência no campanha.ts).
-- Com linha, vale o que ele escolheu, para o dia inteiro (entrega e retirada).

create table public.datas_manuais (
  data date primary key,
  aberta boolean not null,
  atualizado_em timestamptz not null default now()
);

alter table public.datas_manuais enable row level security;

revoke all on table public.datas_manuais from anon, authenticated;
grant select, insert, update, delete on table public.datas_manuais to service_role;
