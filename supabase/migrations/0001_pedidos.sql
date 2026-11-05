-- Reservas de Natal: pedidos, itens e a trava de vagas.
-- O site fala com o banco só pelo servidor, com a chave secreta (papel service_role).
-- Nenhum acesso pelo navegador: RLS ligado e sem políticas, e as funções só para service_role.

create sequence public.pedido_numero_seq;

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'expirado', 'estornar', 'cancelado', 'entregue')),
  nome text not null,
  whatsapp text not null,
  modalidade text not null check (modalidade in ('retirada', 'entrega')),
  data_recebimento date not null,
  cep text,
  rua text,
  numero_endereco text,
  complemento text,
  bairro text,
  cidade text,
  unidades integer not null check (unidades > 0),
  total_centavos integer not null check (total_centavos >= 0),
  sinal_centavos integer not null check (sinal_centavos >= 0),
  expira_em timestamptz not null,
  mp_preferencia_id text,
  mp_pagamento_id text,
  pago_em timestamptz,
  criado_em timestamptz not null default now()
);

create table public.itens_pedido (
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  produto_id text not null,
  quantidade integer not null check (quantidade > 0),
  preco_centavos integer not null check (preco_centavos >= 0),
  primary key (pedido_id, produto_id)
);

create index pedidos_status_expira_idx on public.pedidos (status, expira_em);

alter table public.pedidos enable row level security;
alter table public.itens_pedido enable row level security;

-- Vagas ocupadas: pedidos pagos e pendentes ainda dentro da validade.
-- p_ignorar serve para recontar sem o próprio pedido na confirmação do pagamento.
create function public.vagas_ocupadas(p_ignorar uuid default null)
returns table (reservas integer, produtos integer)
language sql
stable
set search_path = ''
as $$
  select count(*)::integer, coalesce(sum(unidades), 0)::integer
  from public.pedidos
  where (status = 'pago' or (status = 'pendente' and expira_em > now()))
    and (p_ignorar is null or id <> p_ignorar);
$$;

create function public.disponibilidade(p_limite_reservas integer, p_limite_produtos integer)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'reservas_restantes', greatest(p_limite_reservas - o.reservas, 0),
    'produtos_restantes', greatest(p_limite_produtos - o.produtos, 0),
    'esgotado', o.reservas >= p_limite_reservas or o.produtos >= p_limite_produtos
  )
  from public.vagas_ocupadas() o;
$$;

-- Cria o pedido pendente se couber. A trava (advisory lock) faz uma criação de cada vez,
-- então duas clientes nunca ficam com a mesma última vaga.
create function public.criar_pedido(
  p_pedido jsonb,
  p_itens jsonb,
  p_limite_reservas integer,
  p_limite_produtos integer,
  p_validade_minutos integer
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_unidades integer;
  v_ocupadas record;
  v_id uuid;
  v_numero text;
begin
  perform pg_advisory_xact_lock(hashtext('reserva-doces:vagas'));

  select coalesce(sum((i ->> 'quantidade')::integer), 0) into v_unidades
  from jsonb_array_elements(p_itens) i;

  if v_unidades <= 0 then
    return jsonb_build_object('ok', false, 'motivo', 'sem_itens');
  end if;

  select * into v_ocupadas from public.vagas_ocupadas();

  if v_ocupadas.reservas >= p_limite_reservas or v_ocupadas.produtos >= p_limite_produtos then
    return jsonb_build_object('ok', false, 'motivo', 'esgotado');
  end if;

  if v_ocupadas.produtos + v_unidades > p_limite_produtos then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'poucas_unidades',
      'produtos_restantes', p_limite_produtos - v_ocupadas.produtos
    );
  end if;

  v_numero := 'NAT-' || lpad(nextval('public.pedido_numero_seq')::text, 4, '0');

  insert into public.pedidos (
    numero, nome, whatsapp, modalidade, data_recebimento,
    cep, rua, numero_endereco, complemento, bairro, cidade,
    unidades, total_centavos, sinal_centavos, expira_em
  ) values (
    v_numero,
    p_pedido ->> 'nome',
    p_pedido ->> 'whatsapp',
    p_pedido ->> 'modalidade',
    (p_pedido ->> 'data')::date,
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

  insert into public.itens_pedido (pedido_id, produto_id, quantidade, preco_centavos)
  select v_id, i ->> 'produto_id', (i ->> 'quantidade')::integer, (i ->> 'preco_centavos')::integer
  from jsonb_array_elements(p_itens) i;

  return jsonb_build_object('ok', true, 'id', v_id, 'numero', v_numero);
end;
$$;

-- Confirma o pagamento. Dentro da validade, vira "pago". Se chegou depois de expirar,
-- vira "pago" só se ainda houver vaga; senão "estornar", para o Luiz devolver o sinal.
create function public.confirmar_pagamento(
  p_numero text,
  p_pagamento_id text,
  p_limite_reservas integer,
  p_limite_produtos integer
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_pedido public.pedidos;
  v_ocupadas record;
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
    select * into v_ocupadas from public.vagas_ocupadas(v_pedido.id);
    if v_ocupadas.reservas + 1 <= p_limite_reservas
       and v_ocupadas.produtos + v_pedido.unidades <= p_limite_produtos then
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

-- Permissões: só o servidor do site (service_role).
revoke all on table public.pedidos, public.itens_pedido from anon, authenticated;
revoke all on sequence public.pedido_numero_seq from anon, authenticated;
grant select, insert, update, delete on table public.pedidos, public.itens_pedido to service_role;
grant usage on sequence public.pedido_numero_seq to service_role;

revoke execute on function public.vagas_ocupadas(uuid) from public, anon, authenticated;
revoke execute on function public.disponibilidade(integer, integer) from public, anon, authenticated;
revoke execute on function public.criar_pedido(jsonb, jsonb, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.confirmar_pagamento(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.vagas_ocupadas(uuid) to service_role;
grant execute on function public.disponibilidade(integer, integer) to service_role;
grant execute on function public.criar_pedido(jsonb, jsonb, integer, integer, integer) to service_role;
grant execute on function public.confirmar_pagamento(text, text, integer, integer) to service_role;
