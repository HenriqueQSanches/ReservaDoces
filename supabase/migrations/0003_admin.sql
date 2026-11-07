-- Área de administrador: um login para o Luiz e a esposa.
-- A senha fica só como hash (PBKDF2); a sessão é um cookie assinado pelo servidor.

create table public.admins (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,
  senha_hash text not null,
  -- true até a primeira troca de senha
  precisa_trocar boolean not null default true,
  -- muda a cada troca de senha e derruba as sessões antigas
  sessao_versao integer not null default 1,
  -- trava simples contra tentativa de adivinhar a senha
  falhas integer not null default 0,
  bloqueado_ate timestamptz,
  criado_em timestamptz not null default now()
);

alter table public.admins enable row level security;

revoke all on table public.admins from anon, authenticated;
grant select, insert, update on table public.admins to service_role;

-- Permite remover logins do painel
grant delete on table public.admins to service_role;
