-- Limites por produto, data e bloco (regra do Luiz, 07/11/2026).
-- Substitui o limite único de reservas e produtos da campanha.
--   Entrega 12/12 e 19/12: 18 panetones e 10 tortas por dia.
--   Retirada de panetone: bloco 16 a 18 (10 no total, até 5 por dia) e bloco 20 a 23 (4 no total, até 2 por dia).
--   Retirada de torta: 16, 17, 18 e 20 a 23 (28 no total, até 4 por dia). Sem retirada no dia 19.
-- Os números ficam na tabela "limites" e o Luiz edita no painel.

create table public.limites (
  id text primary key,
  nome text not null,
  grupo text not null,
  modalidade text not null check (modalidade in ('retirada', 'entrega')),
  datas date[] not null,
  -- máximo somando todos os dias do bloco; null = sem limite de bloco
  limite_total integer check (limite_total >= 0),
  -- máximo em cada dia do bloco
  limite_dia integer not null check (limite_dia >= 0),
  ordem integer not null default 0
);

alter table public.limites enable row level security;
revoke all on table public.limites from anon, authenticated;
grant select, update on table public.limites to service_role;

insert into public.limites (id, nome, grupo, modalidade, datas, limite_total, limite_dia, ordem) values
  ('entrega-panetone', 'Panetone na entrega', 'panetone', 'entrega', '{2026-12-12,2026-12-19}', null, 18, 1),
  ('entrega-torta', 'Torta Cookie na entrega', 'torta', 'entrega', '{2026-12-12,2026-12-19}', null, 10, 2),
  ('retirada-panetone-inicio', 'Panetone na retirada, 16 a 18/12', 'panetone', 'retirada', '{2026-12-16,2026-12-17,2026-12-18}', 10, 5, 3),
  ('retirada-panetone-fim', 'Panetone na retirada, 20 a 23/12', 'panetone', 'retirada', '{2026-12-20,2026-12-21,2026-12-22,2026-12-23}', 4, 2, 4),
  ('retirada-torta', 'Torta Cookie na retirada, 16 a 23/12 (sem o 19)', 'torta', 'retirada', '{2026-12-16,2026-12-17,2026-12-18,2026-12-20,2026-12-21,2026-12-22,2026-12-23}', 28, 4, 5);

-- Cada item do pedido guarda o grupo do produto (panetone ou torta), que é o que os limites contam
alter table public.itens_pedido add column grupo text;

-- Unidades ocupadas por grupo, modalidade e data: pagos, entregues e pendentes dentro da validade
create function public.unidades_ocupadas(p_ignorar uuid default null)
returns table (grupo text, modalidade text, data date, unidades integer)
language sql
stable
set search_path = ''
as $$
  select i.grupo, p.modalidade, p.data_recebimento, sum(i.quantidade)::integer
  from public.itens_pedido i
  join public.pedidos p on p.id = i.pedido_id
  where (p.status in ('pago', 'entregue') or (p.status = 'pendente' and p.expira_em > now()))
    and (p_ignorar is null or p.id <> p_ignorar)
  group by 1, 2, 3;
$$;

-- O pedido cabe? Confere o limite do dia e o do bloco de cada grupo do pedido.
-- Devolve { ok: true } ou { ok: false, grupo, restante }.
create function public.pedido_cabe(p_modalidade text, p_data date, p_itens jsonb, p_ignorar uuid default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  r record;
  v_regra public.limites;
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

    select coalesce(sum(o.unidades), 0) into v_dia
    from public.unidades_ocupadas(p_ignorar) o
    where o.grupo = r.grupo and o.modalidade = p_modalidade and o.data = p_data;

    select coalesce(sum(o.unidades), 0) into v_bloco
    from public.unidades_ocupadas(p_ignorar) o
    where o.grupo = r.grupo and o.modalidade = p_modalidade and o.data = any (v_regra.datas);

    v_restante := v_regra.limite_dia - v_dia;
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

-- Troca as funções antigas (limite único) pelas que usam os limites por produto
drop function public.criar_pedido(jsonb, jsonb, integer, integer, integer);
drop function public.confirmar_pagamento(text, text, integer, integer);
drop function public.disponibilidade(integer, integer);
drop function public.vagas_ocupadas(uuid);

create function public.criar_pedido(p_pedido jsonb, p_itens jsonb, p_validade_minutos integer)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_unidades integer;
  v_cabe jsonb;
  v_id uuid;
  v_numero text;
begin
  -- Uma criação de cada vez: dois pedidos nunca disputam a mesma última unidade
  perform pg_advisory_xact_lock(hashtext('reserva-doces:vagas'));

  select coalesce(sum((i ->> 'quantidade')::integer), 0) into v_unidades
  from jsonb_array_elements(p_itens) i;
  if v_unidades <= 0 then
    return jsonb_build_object('ok', false, 'motivo', 'sem_itens');
  end if;

  v_cabe := public.pedido_cabe(p_pedido ->> 'modalidade', (p_pedido ->> 'data')::date, p_itens, null);
  if not (v_cabe ->> 'ok')::boolean then
    return jsonb_build_object(
      'ok', false, 'motivo', 'sem_vaga',
      'grupo', v_cabe ->> 'grupo', 'restante', (v_cabe ->> 'restante')::integer
    );
  end if;

  v_numero := 'NAT-' || lpad(nextval('public.pedido_numero_seq')::text, 4, '0');

  insert into public.pedidos (
    numero, nome, whatsapp, modalidade, data_recebimento, hora_retirada,
    cep, rua, numero_endereco, complemento, bairro, cidade,
    unidades, total_centavos, sinal_centavos, expira_em
  ) values (
    v_numero,
    p_pedido ->> 'nome',
    p_pedido ->> 'whatsapp',
    p_pedido ->> 'modalidade',
    (p_pedido ->> 'data')::date,
    case when p_pedido ->> 'modalidade' = 'retirada' then (p_pedido ->> 'hora')::integer end,
    nullif(p_pedido ->> 'cep', ''),
    nullif(p_pedido ->> 'rua', ''),
    nullif(p_pedido ->> 'numero', ''),
    nullif(p_pedido ->> 'complemento', ''),
    nullif(p_pedido ->> 'bairro', ''),
    nullif(p_pedido ->> 'cidade', ''),
    v_unidades,
    (p_pedido ->> 'total_centavos')::integer,
    (p_pedido ->> 'sinal_centavos')::integer,
    now() + make_interval(mins => p_validade_minutos)
  )
  returning id into v_id;

  insert into public.itens_pedido (pedido_id, produto_id, grupo, quantidade, preco_centavos)
  select v_id, i ->> 'produto_id', i ->> 'grupo', (i ->> 'quantidade')::integer, (i ->> 'preco_centavos')::integer
  from jsonb_array_elements(p_itens) i;

  return jsonb_build_object('ok', true, 'id', v_id, 'numero', v_numero);
end;
$$;

-- Confirma o pagamento. Dentro da validade, vira "pago". Se chegou depois de expirar,
-- vira "pago" só se ainda couber nos limites; senão "estornar", para o Luiz devolver o sinal.
create function public.confirmar_pagamento(p_numero text, p_pagamento_id text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_pedido public.pedidos;
  v_itens jsonb;
  v_status text;
begin
  perform pg_advisory_xact_lock(hashtext('reserva-doces:vagas'));

  select * into v_pedido from public.pedidos where numero = p_numero for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'nao_encontrado');
  end if;

  if v_pedido.status in ('pago', 'estornar', 'entregue') then
    return jsonb_build_object('ok', true, 'status', v_pedido.status);
  end if;

  if v_pedido.status = 'pendente' and v_pedido.expira_em > now() then
    v_status := 'pago';
  else
    select coalesce(jsonb_agg(jsonb_build_object('grupo', grupo, 'quantidade', quantidade)), '[]'::jsonb)
    into v_itens
    from public.itens_pedido where pedido_id = v_pedido.id;

    if (public.pedido_cabe(v_pedido.modalidade, v_pedido.data_recebimento, v_itens, v_pedido.id) ->> 'ok')::boolean then
      v_status := 'pago';
    else
      v_status := 'estornar';
    end if;
  end if;

  update public.pedidos
  set status = v_status, mp_pagamento_id = p_pagamento_id, pago_em = now()
  where id = v_pedido.id;

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$$;

revoke execute on function public.unidades_ocupadas(uuid) from public, anon, authenticated;
revoke execute on function public.pedido_cabe(text, date, jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.criar_pedido(jsonb, jsonb, integer) from public, anon, authenticated;
revoke execute on function public.confirmar_pagamento(text, text) from public, anon, authenticated;
grant execute on function public.unidades_ocupadas(uuid) to service_role;
grant execute on function public.pedido_cabe(text, date, jsonb, uuid) to service_role;
grant execute on function public.criar_pedido(jsonb, jsonb, integer) to service_role;
grant execute on function public.confirmar_pagamento(text, text) to service_role;
