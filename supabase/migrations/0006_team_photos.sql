-- ============================================================================
--  Фотографии городов и подпись места проведения дуэли
--
--  В блоке «Алғашқы дуэль» за каждым городом стоит его снимок. Ссылкой, а не
--  загрузкой: фото городов берут из открытых источников, и держать их в базе
--  незачем. Пока ссылки нет, показывается золотой силуэт — раздел выглядит
--  законченным и без фотографий.
--
--  Supabase → SQL Editor → вставить целиком → Run
-- ============================================================================

alter table teams add column if not exists image_url text not null default '';
alter table duels add column if not exists venue     text not null default '';

update duels set venue = 'Астана қаласы' where display_order = 1 and venue = '';

insert into settings (key, value) values
  ('hero_verse',   'Өлең – жүректің тілі, халықтың үні.\nМөлдір өлең – жаңа буынның жұлдызды жолы.'),
  ('footer_verse', 'Өлең – өлмейді, сөз – жоғалмайды.\nСебебі ол – халықпен бірге мәңгі жасайды.'),
  ('first_duel_label', 'Алғашқы дуэль')
on conflict (key) do nothing;

-- Защита от повторного прогона: пара «дата + участники» уникальна.
create unique index if not exists duels_unique_idx on duels (starts_at, team_a, team_b);
