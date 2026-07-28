-- ============================================================================
--  Вместо номера чека — телефон отправителя
--
--  От номера чека и скриншота в WhatsApp отказались: слишком много шагов.
--  Теперь человек оставляет ФИО и номер, с которого отправил оплату — по ним
--  организаторы и сверяют платежи с выпиской Kaspi.
--
--  Supabase → SQL Editor → вставить целиком → Run
-- ============================================================================

alter table claims add column if not exists phone text not null default '';

create index if not exists claims_phone_idx on claims (phone);

-- Номер чека больше не собирается.
alter table claims drop column if exists receipt;
