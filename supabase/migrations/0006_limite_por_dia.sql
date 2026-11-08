-- Limite de um dia específico, por cima do "por dia" do bloco (pedido do Henrique, 08/11/2026).
-- Ex.: bloco de retirada de panetone 20 a 23 com 2 por dia, mas no dia 21 o Luiz consegue 4.
-- Sem linha aqui, o dia usa o limite_dia do bloco. O limite do bloco (limite_total) continua valendo.

create table public.limites_por_dia (
  limite_id text not null references public.limites (id) on delete cascade,
  data date not null,
  limite integer not null check (limite >= 0),
  atualizado_em timestamptz not null default now(),
  primary key (limite_id, data)
);

alter table public.limites_por_dia enable row level security;
revoke all on table public.limites_por_dia from anon, authenticated;
grant select, insert, update, delete on table public.limites_por_dia to service_role;

-- Mesma função de antes, agora olhando primeiro o limite do dia específico
create or replace function public.pedido_cabe(p_modalidade text, p_data date, p_itens jsonb, p_ignorar uuid default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  r record;
  v_regra public.limites;
  v_limite_dia integer;
  v_dia integer;
  v_bloco integer;
  v_restante integer;
begin
  for r in
    select i ->> 'grupo' as grupo, sum((i ->> 'quantidade')::integer) as qtd
    from jsonb_array_elements(p_itens) i
    group by 1
  loop
    select * into v_regra
    from public.limites l
    where l.grupo = r.grupo and l.modalidade = p_modalidade and p_data = any (l.datas)
    limit 1;

    if not found then
      return jsonb_build_object('ok', false, 'grupo', r.grupo, 'restante', 0);
    end if;

    select coalesce(
      (select d.limite from public.limites_por_dia d where d.limite_id = v_regra.id and d.data = p_data),
      v_regra.limite_dia
    ) into v_limite_dia;

    select coalesce(sum(o.unidades), 0) into v_dia
    from public.unidades_ocupadas(p_ignorar) o
    where o.grupo = r.grupo and o.modalidade = p_modalidade and o.data = p_data;

    select coalesce(sum(o.unidades), 0) into v_bloco
    from public.unidades_ocupadas(p_ignorar) o
    where o.grupo = r.grupo and o.modalidade = p_modalidade and o.data = any (v_regra.datas);

    v_restante := v_limite_dia - v_dia;
    if v_regra.limite_total is not null then
      v_restante := least(v_restante, v_regra.limite_total - v_bloco);
    end if;

    if r.qtd > v_restante then
      return jsonb_build_object('ok', false, 'grupo', r.grupo, 'restante', greatest(v_restante, 0));
    end if;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;
