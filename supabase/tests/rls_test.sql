-- Өгөгдлийн сангийн тест: RLS хамгаалалт болон дүрмүүд.
-- Ажиллуулах: npx supabase test db   (дотоод Supabase асаалттай байх ёстой)
-- pgTAP ашиглана: ok(), is(), throws_ok() г.м. шалгалт бүр нэг «ok/not ok» мөр гаргана.
-- Бүгд begin ... rollback дотор ажиллах тул санд юу ч үлдэхгүй.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(25);

-- ===== Бэлтгэл: хоёр туршилтын хэрэглэгч (А ба Б) =====
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.mn', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.mn', 'authenticated', 'authenticated');

-- Тухайн хэрэглэгчээр «нэвтэрсэн» мэт болгох туслах функц
create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- ===== 1. RLS асаалттай =====
select ok((select relrowsecurity from pg_class where oid = 'public.categories'::regclass),   'categories: RLS асаалттай');
select ok((select relrowsecurity from pg_class where oid = 'public.transactions'::regclass), 'transactions: RLS асаалттай');
select ok((select relrowsecurity from pg_class where oid = 'public.budgets'::regclass),      'budgets: RLS асаалттай');

-- ===== 2. Шинэ хэрэглэгчид анхны ангиллууд =====
select is((select count(*) from public.categories where user_id = '00000000-0000-0000-0000-00000000000a'), 14::bigint,
  'Шинэ хэрэглэгч А-д 14 анхны ангилал автоматаар үүссэн');

-- ===== 3. Хэрэглэгч А: өөрийнхөө өгөгдөл =====
select pg_temp.login('00000000-0000-0000-0000-00000000000a');

select is((select count(*) from public.categories), 14::bigint,
  'А зөвхөн өөрийн 14 ангиллыг харна (Б-гийнхийг харахгүй)');

insert into public.transactions (id, type, amount, date, category_id, note)
  values ('tx-a1', 'expense', 25000, '2026-11-18', 'exp-food', 'Талх');
insert into public.budgets (category_id, month, limit_amount) values ('exp-food', '2026-11', 500000);

select is((select user_id from public.transactions where id = 'tx-a1'), '00000000-0000-0000-0000-00000000000a'::uuid,
  'user_id автоматаар нэвтэрсэн хүнийх болно');

-- Сангийн дүрмүүд
select throws_ok($$ insert into public.transactions (id, type, amount, date, category_id) values ('x1', 'expense', 0, '2026-11-18', 'exp-food') $$,
  '23514', null, 'Дүн 0 бол татгалзана');
select throws_ok($$ insert into public.transactions (id, type, amount, date, category_id) values ('x2', 'expense', -500, '2026-11-18', 'exp-food') $$,
  '23514', null, 'Сөрөг дүн татгалзана');
select throws_ok($$ insert into public.transactions (id, type, amount, date, category_id) values ('x3', 'income', 1000, '2026-11-18', 'exp-food') $$,
  '23503', null, 'Орлогын гүйлгээг зарлагын ангилалд хадгалахгүй');
select throws_ok($$ insert into public.transactions (id, type, amount, date, category_id, note) values ('x4', 'expense', 1000, '2026-11-18', 'exp-food', repeat('а', 201)) $$,
  '23514', null, '200 тэмдэгтээс урт тайлбар татгалзана');
select throws_ok($$ insert into public.budgets (category_id, month, limit_amount) values ('inc-salary', '2026-11', 1000) $$,
  '23503', null, 'Орлогын ангилалд төсөв тавихгүй');
select throws_ok($$ insert into public.budgets (category_id, month, limit_amount) values ('exp-fun', '2026-13', 1000) $$,
  '23514', null, 'Буруу сар (13-р сар) татгалзана');
select throws_ok($$ insert into public.categories (id, name, type, color) values ('c-dup', 'хоол ХҮНС', 'expense', '#000000') $$,
  '23505', null, 'Ижил нэртэй ангилал (том/жижиг үсэг өөр) давхардахгүй');
select throws_ok($$ delete from public.categories where id = 'exp-food' $$,
  '23503', null, 'Гүйлгээтэй ангиллыг устгахгүй (F3)');

-- ===== 4. Хэрэглэгч Б: А-гийн өгөгдөлд хүрэхгүй =====
select pg_temp.login('00000000-0000-0000-0000-00000000000b');

select is((select count(*) from public.transactions), 0::bigint, 'Б нь А-гийн гүйлгээг харахгүй');
select is((select count(*) from public.budgets), 0::bigint, 'Б нь А-гийн төсвийг харахгүй');

update public.transactions set amount = 1 where id = 'tx-a1';
delete from public.transactions where id = 'tx-a1';

select throws_ok($$ insert into public.transactions (user_id, id, type, amount, date, category_id) values ('00000000-0000-0000-0000-00000000000a', 'hack', 'expense', 1000, '2026-11-18', 'exp-food') $$,
  '42501', null, 'Б нь А-гийн нэр дээр гүйлгээ нэмж чадахгүй');

-- А руу буцаж ороод гүйлгээ нь хэвээр эсэхийг шалгана
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select is((select amount from public.transactions where id = 'tx-a1'), 25000::bigint,
  'Б-гийн засах, устгах оролдлого А-гийн гүйлгээнд нөлөөлөөгүй');

-- Гүйлгээгүй ангиллыг устгахад төсөв нь хамт устана
insert into public.budgets (category_id, month, limit_amount) values ('exp-fun', '2026-11', 100000);
delete from public.categories where id = 'exp-fun';
select is((select count(*) from public.budgets where category_id = 'exp-fun'), 0::bigint,
  'Ангилал устахад төсөв нь хамт устана');

-- ===== 5. Бүх өгөгдлийг солих (replace_all_data) =====
select public.replace_all_data('{
  "categories":   [{"id":"exp-food","name":"Хоол","type":"expense","color":"#e76f51"}],
  "transactions": [{"id":"n1","type":"expense","amount":1000,"date":"2026-10-01","categoryId":"exp-food","note":"Сүү"}],
  "budgets":      [{"categoryId":"exp-food","month":"2026-10","limit":5000}]
}'::jsonb);
select is((select count(*) from public.transactions), 1::bigint, 'Нөөц оруулахад хуучин гүйлгээ солигдоно');

-- Алдаатай өгөгдөл (дүн 0) бол юу ч өөрчлөгдөхгүй — хуучин өгөгдөл хэвээр
select throws_ok($$ select public.replace_all_data('{"categories":[],"transactions":[{"id":"z","type":"expense","amount":0,"date":"2026-10-01","categoryId":"exp-food"}],"budgets":[]}'::jsonb) $$,
  null, null, 'Алдаатай нөөц татгалзагдана');
select is((select note from public.transactions where id = 'n1'), 'Сүү',
  'Алдаатай нөөцийн дараа өмнөх өгөгдөл хэвээр үлдсэн');

-- Б-гийн өгөгдөлд хүрээгүй
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select is((select count(*) from public.categories), 14::bigint, 'А нөөц оруулахад Б-гийн ангиллууд хэвээр');

-- ===== 6. Нэвтрээгүй хүн (anon) =====
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('role', 'anon', true);

select throws_ok($$ select count(*) from public.transactions $$, '42501', null, 'Нэвтрээгүй хүн гүйлгээ уншиж чадахгүй');
select throws_ok($$ select count(*) from public.categories $$,   '42501', null, 'Нэвтрээгүй хүн ангилал уншиж чадахгүй');

select * from finish();
rollback;
