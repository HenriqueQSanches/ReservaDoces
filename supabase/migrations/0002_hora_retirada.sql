-- Retirada tem hora marcada (10h às 20h, de hora em hora). Entrega não tem horário.

alter table public.pedidos
  add column hora_retirada integer check (hora_retirada between 0 and 23);

alter table public.pedidos
  add constraint pedidos_hora_so_na_retirada
  check ((modalidade = 'retirada') = (hora_retirada is not null));

create or replace function public.criar_pedido(
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

  insert into public.itens_pedido (pedido_id, produto_id, quantidade, preco_centavos)
  select v_id, i ->> 'produto_id', (i ->> 'quantidade')::integer, (i ->> 'preco_centavos')::integer
  from jsonb_array_elements(p_itens) i;

  return jsonb_build_object('ok', true, 'id', v_id, 'numero', v_numero);
end;
$$;

-- Contagem por data, para o Luiz fechar o pedido com a padaria.
-- Entra o que está pago ou pendente dentro da validade; retirada vem agrupada por hora.
create or replace view public.unidades_por_data as
select
  modalidade,
  data_recebimento,
  hora_retirada,
  count(*)::integer as reservas,
  sum(unidades)::integer as unidades
from public.pedidos
where status = 'pago' or (status = 'pendente' and expira_em > now())
group by modalidade, data_recebimento, hora_retirada
order by data_recebimento, hora_retirada;

revoke all on public.unidades_por_data from anon, authenticated;
grant select on public.unidades_por_data to service_role;
