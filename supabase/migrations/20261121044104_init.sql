-- «Манай төсөв» — өгөгдлийн сангийн анхны бүтэц (SPEC.md, 4-р хэсэг)
--
-- Гол санаа:
--  * Мөр бүр user_id-тай: аль хэрэглэгчийнх болохыг заана.
--  * RLS (Row Level Security): нэвтэрсэн хүн зөвхөн өөрийн мөрийг харж, засна.
--    Нийтийн (anon/publishable) түлхүүр кодонд ил байсан ч бусдын өгөгдөлд хүрэхгүй.
--  * Дүрмүүдийг (дүн > 0, ангилал төрөлтэйгээ таарах г.м.) сан өөрөө шалгана —
--    апп алдаа гаргасан ч буруу өгөгдөл хадгалагдахгүй.
--  * id-ууд нь апп дотор үүсдэг текст (жишээ нь 'exp-food' эсвэл UUID) хэвээр.
--    Тиймээс одоогийн JSON нөөцийг шууд оруулж болно.
--    Хэрэглэгч бүр ижил 'exp-food' id-тай байж болохын тулд түлхүүр нь (user_id, id).


-- ===== 1. Ангилал =====
create table public.categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id      text not null check (length(id) between 1 and 100),
  name    text not null check (length(trim(name)) between 1 and 50),
  type    text not null check (type in ('income', 'expense')),
  color   text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  primary key (user_id, id),
  -- Гүйлгээ, төсөв «ангилал + төрөл»-өөр холбогдохын тулд (доор FK-д хэрэгтэй)
  unique (user_id, id, type)
);

-- Нэг хэрэглэгчид ижил төрлийн ижил нэртэй ангилал давхардахгүй (том/жижиг үсэг ялгахгүй)
create unique index categories_unique_name
  on public.categories (user_id, type, lower(trim(name)));


-- ===== 2. Гүйлгээ =====
create table public.transactions (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id          text not null check (length(id) between 1 and 100),
  type        text not null check (type in ('income', 'expense')),
  amount      bigint not null check (amount > 0),          -- Бүхэл төгрөг
  date        date not null,
  category_id text not null,
  note        text not null default '' check (length(note) <= 200),
  created_at  timestamptz not null default now(),
  primary key (user_id, id),
  -- Ангилал нь мөн энэ хэрэглэгчийнх, мөн гүйлгээний төрөлтэй таарах ёстой.
  -- on delete restrict: гүйлгээтэй ангиллыг устгахыг сан өөрөө хориглоно (F3).
  foreign key (user_id, category_id, type)
    references public.categories (user_id, id, type) on delete restrict
);

-- Сараар шүүх, огноогоор эрэмбэлэхийг хурдасгана
create index transactions_user_date on public.transactions (user_id, date desc);


-- ===== 3. Төсөв =====
-- «limit» гэдэг нь SQL болон Supabase API-ийн тусгай үг тул limit_amount гэж нэрлэв.
create table public.budgets (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id   text not null,
  month         text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),   -- YYYY-MM
  limit_amount  bigint not null check (limit_amount > 0),
  -- Төсөв зөвхөн зарлагын ангилалд тавигдана. Энэ багана үргэлж 'expense' байж,
  -- доорх FK-аар ангилал нь зарлагынх эсэхийг шалгана.
  category_type text not null default 'expense' check (category_type = 'expense'),
  primary key (user_id, category_id, month),
  -- Ангилал устгахад төсөв нь хамт устана
  foreign key (user_id, category_id, category_type)
    references public.categories (user_id, id, type) on delete cascade
);


-- ===== 4. RLS: хүн бүр зөвхөн өөрийн мөрийг =====
-- (select auth.uid()) — нэвтэрсэн хүний id. Хаалтанд бичвэл мөр бүрт дахин
-- тооцоолохгүй, нэг л удаа тооцоолдог тул хурдан.
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;

create policy "Өөрийн ангилал" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Өөрийн гүйлгээ" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Өөрийн төсөв" on public.budgets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Нэвтрээгүй хүнд (anon) эдгээр хүснэгтэд ямар ч эрх өгөхгүй — давхар хамгаалалт
revoke all on public.categories, public.transactions, public.budgets from anon;


-- ===== 5. Шинэ хэрэглэгчид анхны 14 ангилал =====
-- Хэрэглэгч анх бүртгүүлэхэд (auth.users-д мөр нэмэгдэхэд) автоматаар ажиллана.
-- id, нэр, өнгө нь js/storage.js-ийн DEFAULT_CATEGORIES-тай яг ижил.
create function public.create_default_categories()
returns trigger
language plpgsql
security definer          -- RLS-ийг тойрч бичих эрхтэй (шинэ хэрэглэгч хараахан нэвтрээгүй)
set search_path = ''      -- Хортой схемээр солигдохоос хамгаална
as $$
begin
  insert into public.categories (user_id, id, name, type, color) values
    (new.id, 'exp-food',      'Хоол хүнс',                                    'expense', '#e76f51'),
    (new.id, 'exp-housing',   'Орон сууц/түрээс',                             'expense', '#8d6e63'),
    (new.id, 'exp-utilities', 'Нийтийн төлбөр (цахилгаан, дулаан, интернэт)', 'expense', '#f4a261'),
    (new.id, 'exp-transport', 'Тээвэр/шатахуун',                              'expense', '#457b9d'),
    (new.id, 'exp-education', 'Хүүхдийн сургалт',                             'expense', '#6a4c93'),
    (new.id, 'exp-health',    'Эрүүл мэнд',                                   'expense', '#e63946'),
    (new.id, 'exp-clothing',  'Хувцас',                                       'expense', '#ff70a6'),
    (new.id, 'exp-loan',      'Зээлийн төлөлт',                               'expense', '#264653'),
    (new.id, 'exp-fun',       'Зугаа цэнгэл',                                 'expense', '#2a9d8f'),
    (new.id, 'exp-other',     'Бусад',                                        'expense', '#9e9e9e'),
    (new.id, 'inc-salary',    'Цалин',                                        'income',  '#2e7d32'),
    (new.id, 'inc-side',      'Нэмэлт ажил',                                  'income',  '#43a047'),
    (new.id, 'inc-child',     'Хүүхдийн мөнгө',                               'income',  '#66bb6a'),
    (new.id, 'inc-other',     'Бусад',                                        'income',  '#a5d6a7');
  return new;
end;
$$;

-- Энэ функцийг апп-аас шууд дуудах боломжгүй болгоно (зөвхөн trigger ажиллуулна)
revoke execute on function public.create_default_categories() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_default_categories();
