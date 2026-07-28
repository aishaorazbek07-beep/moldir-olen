-- ============================================================================
--  Предстоящие дуэли и ссылка на прямой эфир
--
--  Афиша хранится прямо в базе (base64 в тексте), а не в объектном хранилище:
--  Supabase Storage потребовал бы отдельного ключа и настройки политик доступа,
--  а афиш всего несколько штук по паре сотен килобайт. Отдаётся через
--  /api/duel/{id}/poster с длинным кэшем.
--
--  Supabase → SQL Editor → вставить целиком → Run
-- ============================================================================

create table if not exists duels (
  id            serial primary key,
  starts_at     timestamptz not null,
  team_a        text        not null,
  team_b        text        not null,
  price         integer     not null default 0,
  ticket_url    text        not null default '',
  poster_mime   text        not null default '',
  poster_data   text        not null default '',
  is_active     boolean     not null default true,
  display_order smallint    not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists duels_active_idx on duels (is_active, starts_at);

alter table duels enable row level security;

insert into settings (key, value) values
  ('youtube_url',   'https://youtube.com/@moldirolen'),
  ('youtube_label', '@moldirolen'),
  ('duels_title',   'Алдағы дуэльдер')
on conflict (key) do nothing;

-- Расписание из афиши проекта. Правится в админке.
insert into duels (starts_at, team_a, team_b, price, display_order) values
  ('2026-07-29 19:00+05', 'Астана қаласы',           'Павлодар облысы',    10000, 1),
  ('2026-08-05 19:00+05', 'Абай облысы',             'Алматы қаласы',      10000, 2),
  ('2026-08-12 19:00+05', 'Батыс Қазақстан облысы',  'Қызылорда облысы',   10000, 3)
on conflict do nothing;
