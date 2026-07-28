-- ============================================================================
--  Переход на ручную сверку платежей + управляемое содержимое
--
--  ApiPay убран: ждать ключи и упираться в лимиты некогда. Голос теперь
--  записывается как ЗАЯВКА, а факт оплаты организаторы сверяют вручную по
--  скриншотам в WhatsApp и номеру чека.
--
--  Города и тексты живут здесь и правятся из админки. В коде остаётся их
--  резервная копия (src/lib/fallback.ts): если база недоступна, сайт всё равно
--  показывает города и ссылки на оплату — в прямом эфире это важнее всего.
--
--  Supabase → SQL Editor → вставить целиком → Run
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Города-участники. Управляются из админки: добавить, переименовать, скрыть.
-- ---------------------------------------------------------------------------
drop table if exists teams cascade;

create table teams (
  id            serial primary key,
  slug          text        not null unique,
  name          text        not null,
  place_label   text        not null default '',
  color_index   smallint    not null default 1,
  -- Своя ссылка Kaspi у каждого города.
  kaspi_url     text        not null default '',
  display_order smallint    not null default 0,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now()
);

insert into teams (slug, name, place_label, color_index, kaspi_url, display_order) values
  ('astana',   'Астана',   'Финалист', 1, 'https://pay.kaspi.kz/pay/gyhuj7li', 1),
  ('pavlodar', 'Павлодар', 'Финалист', 3, '',                                  2);

-- ---------------------------------------------------------------------------
--  Настройки сайта: тексты, цены, что открыто, а что «пока закрыто».
--  Ключ-значение, чтобы добавлять новые поля без миграций.
-- ---------------------------------------------------------------------------
create table if not exists settings (
  key        text primary key,
  value      text        not null default '',
  updated_at timestamptz not null default now()
);

insert into settings (key, value) values
  ('vote_price',        '500'),
  ('whatsapp_number',   ''),
  ('vote_eyebrow',      'Суперфинал'),
  ('vote_title',        'Дауыс беріңіз'),
  ('vote_lead',         'Екі қала — бір тақ. Сіздің дауысыңыз тағдырды шешеді.'),
  ('vote_note',         'Дауыс Kaspi арқылы төленеді'),
  ('hero_tagline',      'Ұлттық поэзиялық жоба'),
  ('hero_tag_1',        '20 өңір'),
  ('hero_tag_2',        '60 ақын'),
  ('hero_tag_3',        '3 000 000 ₸ бас жүлде'),
  ('tickets_open',      'false'),
  ('applications_open', 'false'),
  ('closed_notice',     'Бұл бөлім әзірге жабық. Жақында ашылады.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
--  Заявки на голос
--
--  status:
--    claimed   — человек прошёл шаги, оплату ещё не сверяли. Идёт в счётчик.
--    confirmed — оплата найдена в выписке.
--    rejected  — оплаты нет. Из счётчика вычитается.
--
--  team_slug строкой, а не ссылкой: город могут переименовать или удалить,
--  но заявка должна остаться в истории как есть.
-- ---------------------------------------------------------------------------
create table if not exists claims (
  id          bigserial primary key,
  kind        text        not null default 'vote' check (kind in ('vote', 'ticket', 'application')),
  team_slug   text,
  quantity    integer     not null default 1 check (quantity > 0),
  amount      integer     not null check (amount >= 0),
  payer_name  text        not null default '',
  receipt     text        not null default '',
  details     jsonb       not null default '{}'::jsonb,
  status      text        not null default 'claimed'
                check (status in ('claimed', 'confirmed', 'rejected')),
  ip          text,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists claims_status_created_idx on claims (status, created_at desc);
create index if not exists claims_team_idx           on claims (team_slug, status);
create index if not exists claims_created_idx        on claims (created_at desc);
create index if not exists claims_ip_created_idx     on claims (ip, created_at desc);
create index if not exists claims_receipt_idx        on claims (receipt);

-- ---------------------------------------------------------------------------
--  Ручная корректировка счётчиков. Журнал и текущее значение — одно и то же:
--  итог считается суммой строк, поэтому правку видно и можно отменить.
-- ---------------------------------------------------------------------------
create table if not exists vote_adjustments_v2 (
  id         bigserial primary key,
  team_slug  text        not null,
  delta      integer     not null,
  created_at timestamptz not null default now()
);

create index if not exists vote_adjustments_v2_team_idx    on vote_adjustments_v2 (team_slug);
create index if not exists vote_adjustments_v2_created_idx on vote_adjustments_v2 (created_at desc);

alter table teams               enable row level security;
alter table settings            enable row level security;
alter table claims              enable row level security;
alter table vote_adjustments_v2 enable row level security;

-- ---------------------------------------------------------------------------
--  Наследие ApiPay больше не используется
-- ---------------------------------------------------------------------------
drop table if exists webhook_events;
drop table if exists votes;
drop table if exists tickets;
drop table if exists applications;
drop table if exists payments;
drop table if exists vote_adjustments;
