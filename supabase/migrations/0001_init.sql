-- ============================================================================
--  Мөлдір өлең — начальная схема
--  Supabase → SQL Editor → вставить целиком → Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
--  Команды финала
-- ---------------------------------------------------------------------------
create table if not exists teams (
  id               serial primary key,
  slug             text        not null unique,
  name             text        not null,
  place_label      text        not null default '',
  color_index      smallint    not null default 1,
  -- Ручная корректировка из админки. Хранится отдельно от оплаченных голосов,
  -- чтобы настоящую цифру всегда можно было узнать.
  admin_adjustment integer     not null default 0,
  display_order    smallint    not null default 0,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Платежи
-- ---------------------------------------------------------------------------
create table if not exists payments (
  id                 uuid primary key default gen_random_uuid(),
  -- Наш идентификатор заказа, он же external_order_id в ApiPay.
  external_order_id  text        not null unique,
  apipay_invoice_id  text,
  kind               text        not null check (kind in ('vote', 'ticket', 'application')),
  -- Сумма в тенге, посчитанная сервером. Источник истины при сверке с webhook'ом.
  expected_amount    integer     not null check (expected_amount > 0),
  phone              text        not null,
  status             text        not null default 'pending'
                       check (status in ('pending','paid','cancelled','expired','error','amount_mismatch')),
  meta               jsonb       not null default '{}'::jsonb,
  ip                 text,
  created_at         timestamptz not null default now(),
  paid_at            timestamptz
);

create index if not exists payments_status_created_idx on payments (status, created_at desc);
create index if not exists payments_kind_created_idx   on payments (kind, created_at desc);
create index if not exists payments_phone_created_idx  on payments (phone, created_at desc);
create index if not exists payments_ip_created_idx     on payments (ip, created_at desc);
create index if not exists payments_invoice_idx        on payments (apipay_invoice_id);

-- ---------------------------------------------------------------------------
--  Выдачи. UNIQUE(payment_id) — та самая защита от повторных webhook'ов:
--  ApiPay ретраит доставку до 11 раз, база гасит дубли сама.
-- ---------------------------------------------------------------------------
create table if not exists votes (
  id         bigserial primary key,
  payment_id uuid        not null unique references payments (id) on delete cascade,
  team_id    integer     not null references teams (id),
  quantity   integer     not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists votes_team_idx on votes (team_id);

create table if not exists tickets (
  id            bigserial primary key,
  payment_id    uuid        not null unique references payments (id) on delete cascade,
  show_slug     text        not null,
  qty           integer     not null check (qty > 0),
  ticket_number text        not null unique,
  created_at    timestamptz not null default now()
);

create table if not exists applications (
  id         bigserial primary key,
  payment_id uuid        not null unique references payments (id) on delete cascade,
  name       text        not null,
  birth_year integer     not null,
  region     text        not null default '',
  resume     text        not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Журнал ручных правок голосов. Виден только в админке.
-- ---------------------------------------------------------------------------
create table if not exists vote_adjustments (
  id         bigserial primary key,
  team_id    integer     not null references teams (id),
  delta      integer     not null,
  created_at timestamptz not null default now()
);

create index if not exists vote_adjustments_created_idx on vote_adjustments (created_at desc);

-- ---------------------------------------------------------------------------
--  Журнал входящих webhook'ов — на случай разбора спорных платежей
-- ---------------------------------------------------------------------------
create table if not exists webhook_events (
  id                bigserial primary key,
  event             text,
  external_order_id text,
  invoice_status    text,
  signature_valid   boolean     not null,
  outcome           text,
  payload           jsonb,
  received_at       timestamptz not null default now()
);

create index if not exists webhook_events_received_idx on webhook_events (received_at desc);

-- ---------------------------------------------------------------------------
--  Команды суперфинала. Замените названия на настоящие финалистов.
-- ---------------------------------------------------------------------------
insert into teams (slug, name, place_label, color_index, display_order) values
  ('almaty',    'Алматы облысы',    '1-орын иегері', 1, 1),
  ('turkistan', 'Түркістан облысы', '2-орын иегері', 2, 2),
  ('pavlodar',  'Павлодар облысы',  '3-орын иегері', 3, 3)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
--  Доступ к таблицам только через наш сервер (service role / прямое подключение).
--  RLS включён, политик нет — значит анонимный ключ не прочитает ничего.
-- ---------------------------------------------------------------------------
alter table teams            enable row level security;
alter table payments         enable row level security;
alter table votes            enable row level security;
alter table tickets          enable row level security;
alter table applications     enable row level security;
alter table vote_adjustments enable row level security;
alter table webhook_events   enable row level security;
