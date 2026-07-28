-- ============================================================================
--  Наполнение: поэты и книги
--
--  Сайт выглядел «скелетом» — одно голосование и ничего вокруг. Эти два
--  раздела дают то, ради чего на страницу возвращаются между эфирами.
--
--  Картинки задаются ссылкой (image_url), а не загрузкой: так их можно взять
--  из Instagram проекта или любого хостинга, не перегружая базу.
--
--  Supabase → SQL Editor → вставить целиком → Run
-- ============================================================================

create table if not exists poets (
  id            serial primary key,
  name          text        not null,
  region        text        not null default '',
  bio           text        not null default '',
  quote         text        not null default '',
  image_url     text        not null default '',
  is_active     boolean     not null default true,
  display_order smallint    not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists poets_active_idx on poets (is_active, display_order);

create table if not exists books (
  id            serial primary key,
  title         text        not null,
  author        text        not null default '',
  description   text        not null default '',
  price         integer     not null default 0,
  buy_url       text        not null default '',
  image_url     text        not null default '',
  is_active     boolean     not null default true,
  display_order smallint    not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists books_active_idx on books (is_active, display_order);

alter table poets enable row level security;
alter table books enable row level security;

insert into settings (key, value) values
  ('poets_title',  'Ақындар туралы'),
  ('poets_lead',   'Додаға қатысып жүрген ақындармен танысыңыз.'),
  ('books_title',  'Кітап алу'),
  ('books_lead',   'Жоба ақындарының жинақтары.'),
  ('about_title',  'Жоба туралы'),
  ('about_text',   'Мөлдір өлең — қазақ поэзиясын сахнаға шығаратын ұлттық жоба. Әр кеш — екі өңірдің ақындары арасындағы дуэль. Жеңімпазды халық дауысы шешеді.')
on conflict (key) do nothing;

-- Оставшиеся дуэли сезона. Правятся в админке.
insert into duels (starts_at, team_a, team_b, price, display_order) values
  ('2026-08-19 19:00+05', 'Семей облысы',    'Алматы қаласы',    10000, 4),
  ('2026-08-26 19:00+05', 'Жамбыл облысы',   'Ақтөбе облысы',    10000, 5),
  ('2026-09-02 19:00+05', 'Қарағанды облысы','Атырау облысы',    10000, 6)
on conflict do nothing;
