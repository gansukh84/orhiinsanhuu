// Өгөгдлийг браузерын localStorage-д унших, бичих модуль.
// Бүх өгөгдөл нэг JSON объект болж 'budget-app-v1' түлхүүрээр хадгалагдана.
//
// Функцууд storage-ийг параметрээр авдаг. Ингэснээр тест дээр
// жинхэнэ localStorage-ийн оронд хуурамч объект өгч шалгаж болно.

export const STORAGE_KEY = 'budget-app-v1';
export const DATA_VERSION = 1;

// Анхны ангиллууд (SPEC.md, 4-р хэсэг).
// id-г тогтмол бичсэн тул хэдэн ч удаа ачаалсан ижил байна.
export const DEFAULT_CATEGORIES = [
  // Зарлагын ангиллууд
  { id: 'exp-food',       name: 'Хоол хүнс',                                   type: 'expense', color: '#e76f51' },
  { id: 'exp-housing',    name: 'Орон сууц/түрээс',                            type: 'expense', color: '#8d6e63' },
  { id: 'exp-utilities',  name: 'Нийтийн төлбөр (цахилгаан, дулаан, интернэт)', type: 'expense', color: '#f4a261' },
  { id: 'exp-transport',  name: 'Тээвэр/шатахуун',                             type: 'expense', color: '#457b9d' },
  { id: 'exp-education',  name: 'Хүүхдийн сургалт',                            type: 'expense', color: '#6a4c93' },
  { id: 'exp-health',     name: 'Эрүүл мэнд',                                  type: 'expense', color: '#e63946' },
  { id: 'exp-clothing',   name: 'Хувцас',                                      type: 'expense', color: '#ff70a6' },
  { id: 'exp-loan',       name: 'Зээлийн төлөлт',                              type: 'expense', color: '#264653' },
  { id: 'exp-fun',        name: 'Зугаа цэнгэл',                                type: 'expense', color: '#2a9d8f' },
  { id: 'exp-other',      name: 'Бусад',                                       type: 'expense', color: '#9e9e9e' },
  // Орлогын ангиллууд
  { id: 'inc-salary',     name: 'Цалин',                                       type: 'income',  color: '#2e7d32' },
  { id: 'inc-side',       name: 'Нэмэлт ажил',                                 type: 'income',  color: '#43a047' },
  { id: 'inc-child',      name: 'Хүүхдийн мөнгө',                              type: 'income',  color: '#66bb6a' },
  { id: 'inc-other',      name: 'Бусад',                                       type: 'income',  color: '#a5d6a7' },
];

// Шинэ, хоосон өгөгдөл үүсгэнэ (анхны ангиллуудтай).
// Ангиллуудыг хуулж өгдөг тул DEFAULT_CATEGORIES өөрөө өөрчлөгдөхгүй.
export function createDefaultData() {
  return {
    version: DATA_VERSION,
    transactions: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    budgets: [],
  };
}

// Өгөгдлийн дээд түвшний бүтэц зөв эсэхийг шалгана.
export function isValidData(data) {
  return (
    data !== null &&
    typeof data === 'object' &&
    data.version === DATA_VERSION &&
    Array.isArray(data.transactions) &&
    Array.isArray(data.categories) &&
    Array.isArray(data.budgets)
  );
}

// Хадгалсан өгөгдлийг уншина.
// Юу ч хадгалаагүй, эсвэл эвдэрсэн байвал анхны өгөгдлийг буцаана —
// ингэснээр апп хэзээ ч алдаа өгч унахгүй.
export function loadData(storage = globalThis.localStorage) {
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (err) {
    // Хувийн цонх зэрэгт localStorage хаалттай байж болно
    console.warn('localStorage уншиж чадсангүй:', err);
    return createDefaultData();
  }

  if (raw === null) return createDefaultData();

  try {
    const data = JSON.parse(raw);
    if (isValidData(data)) return data;
    console.warn('Хадгалсан өгөгдлийн бүтэц буруу байна, анхны өгөгдлийг ашиглана.');
  } catch (err) {
    console.warn('Хадгалсан өгөгдөл эвдэрсэн байна (JSON биш):', err);
  }
  return createDefaultData();
}

// Өгөгдөл хадгалагдсан эсэхийг шалгана (анх удаа нээж буй эсэхийг мэдэхэд).
export function hasStoredData(storage = globalThis.localStorage) {
  try {
    return storage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

// Өгөгдлийг JSON болгоод хадгална. Амжилттай бол true буцаана.
export function saveData(data, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('localStorage-д хадгалж чадсангүй:', err);
    return false;
  }
}

// ===== JSON нөөц: татах, оруулах (F8) =====

// Татах файлын нэр. Жишээ: "manai-tusuv-2026-11-21.json"
export function backupFileName(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `manai-tusuv-${y}-${m}-${d}.json`;
}

// Өгөгдлийг уншихад гоё, догол мөртэй JSON текст болгоно
export function exportData(data) {
  return JSON.stringify(data, null, 2);
}

// Туслах шалгалтууд (оруулж буй файлын мөр бүрийг шалгахад)
const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isType = (v) => v === 'income' || v === 'expense';
const isPositiveInt = (v) => Number.isSafeInteger(v) && v > 0;
const isDay = (v) => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v);
const isMonth = (v) => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const isColor = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

// Оруулах гэж буй JSON текстийг бүрэн шалгана.
// Амжилттай: { ok: true, data }   Алдаатай: { ok: false, error: 'монгол тайлбар' }
// Энэ функц localStorage-д юу ч бичихгүй — тиймээс алдаатай файл одоогийн өгөгдлийг устгахгүй.
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Файл JSON хэлбэртэй биш байна.' };
  }
  if (!isValidData(data)) {
    return { ok: false, error: 'Энэ файл «Манай төсөв»-ийн нөөц биш байна (бүтэц эсвэл хувилбар таарахгүй).' };
  }

  // Ангиллууд
  const categoryById = new Map();
  for (const [i, c] of data.categories.entries()) {
    if (!c || !isText(c.id) || !isText(c.name) || !isType(c.type) || !isColor(c.color)) {
      return { ok: false, error: `${i + 1}-р ангилал буруу байна.` };
    }
    if (categoryById.has(c.id)) {
      return { ok: false, error: `Ангиллын id давхардсан байна: ${c.id}` };
    }
    categoryById.set(c.id, c);
  }

  // Гүйлгээнүүд
  const txIds = new Set();
  for (const [i, t] of data.transactions.entries()) {
    const category = t && categoryById.get(t.categoryId);
    const ok =
      t && isText(t.id) && !txIds.has(t.id) &&
      isType(t.type) && isPositiveInt(t.amount) && isDay(t.date) &&
      category && category.type === t.type &&
      (t.note === undefined || typeof t.note === 'string') &&
      (t.createdAt === undefined || typeof t.createdAt === 'string');
    if (!ok) {
      return { ok: false, error: `${i + 1}-р гүйлгээ буруу байна.` };
    }
    txIds.add(t.id);
  }

  // Төсвүүд — зөвхөн зарлагын ангилалд тавина
  for (const [i, b] of data.budgets.entries()) {
    const category = b && categoryById.get(b.categoryId);
    if (!category || category.type !== 'expense' || !isMonth(b.month) || !isPositiveInt(b.limit)) {
      return { ok: false, error: `${i + 1}-р төсөв буруу байна.` };
    }
  }

  return { ok: true, data };
}

// ===== Үүлэн хадгалалт: Supabase (BAIRSHUULALT.md, 5-р алхам) =====
//
// Функц бүр Supabase client-ийг параметрээр авна (localStorage-ийн адил).
// Ингэснээр тест дээр хуурамч client өгч шалгаж болно, энэ файл интернэтээс юу ч ачаалахгүй.
// Алдаа гарвал монгол тайлбартай Error шиднэ (throw) — app.js түүнийг хэрэглэгчид харуулна.
//
// Сангийн талбарын нэр апп-аас арай өөр (snake_case):
//   categoryId ↔ category_id,  createdAt ↔ created_at,  limit ↔ limit_amount

// --- Сангийн мөр ↔ апп-ын объект хөрвүүлэх ---

export function categoryFromRow(row) {
  return { id: row.id, name: row.name, type: row.type, color: row.color };
}

export function transactionFromRow(row) {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    date: row.date,
    categoryId: row.category_id,
    note: row.note ?? '',
    createdAt: row.created_at,
  };
}

export function transactionToRow(tx) {
  // user_id-г бичихгүй — сан өөрөө нэвтэрсэн хүний id-г тавина
  return {
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    date: tx.date,
    category_id: tx.categoryId,
    note: tx.note ?? '',
    ...(tx.createdAt ? { created_at: tx.createdAt } : {}),
  };
}

export function budgetFromRow(row) {
  return { categoryId: row.category_id, month: row.month, limit: Number(row.limit_amount) };
}

export function budgetToRow(budget) {
  return { category_id: budget.categoryId, month: budget.month, limit_amount: budget.limit };
}

// --- Алдааг монгол мессеж болгох ---

export const OFFLINE_MESSAGE = 'Интернэт холболт алга. Өөрчлөлт хадгалагдсангүй — холболтоо шалгаад дахин оролдоно уу.';

export function friendlyError(error) {
  const code = error?.code;
  const text = String(error?.message ?? '');
  if (globalThis.navigator?.onLine === false || /failed to fetch|networkerror|load failed/i.test(text)) {
    return OFFLINE_MESSAGE;
  }
  if (code === '23505') return 'Ийм нэртэй ангилал аль хэдийн байна.';
  if (code === '23503') return 'Ангилал таарахгүй байна, эсвэл энэ ангилалд гүйлгээ байгаа тул устгах боломжгүй.';
  if (code === '23514') return 'Утга буруу байна (дүн 0-ээс их, тайлбар 200 тэмдэгтээс богино байх ёстой).';
  if (code === '42501' || code === 'PGRST301' || /jwt/i.test(text)) {
    return 'Нэвтрэх хугацаа дууссан байна. Хуудсыг дахин ачаалж, дахин нэвтэрнэ үү.';
  }
  return 'Хадгалж чадсангүй. Хэсэг хүлээгээд дахин оролдоно уу.';
}

// Supabase-ийн хариуг шалгана: алдаатай бол монгол мессежтэй Error шиднэ
function check({ data, error }) {
  if (error) {
    const err = new Error(friendlyError(error));
    err.cause = error;  // Жинхэнэ алдааг консолд харахад
    throw err;
  }
  return data;
}

// --- Унших ---

// Supabase нэг удаад 1000 хүртэл мөр буцаадаг тул хэсэг хэсгээр нь бүгдийг уншина
export const PAGE_SIZE = 1000;

async function fetchAllRows(client, table, orderBy) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = check(
      await client.from(table).select('*').order(orderBy).range(from, from + PAGE_SIZE - 1)
    );
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

// Нэвтэрсэн хэрэглэгчийн бүх өгөгдлийг уншина (RLS зөвхөн өөрийнхийг нь өгнө)
export async function fetchAllData(client) {
  const [categories, transactions, budgets] = await Promise.all([
    fetchAllRows(client, 'categories', 'id'),
    fetchAllRows(client, 'transactions', 'id'),
    fetchAllRows(client, 'budgets', 'month'),
  ]);
  return {
    version: DATA_VERSION,
    categories: categories.map(categoryFromRow),
    transactions: transactions.map(transactionFromRow),
    budgets: budgets.map(budgetFromRow),
  };
}

// --- Гүйлгээ ---

export async function addTransaction(client, tx) {
  check(await client.from('transactions').insert(transactionToRow(tx)));
}

export async function updateTransaction(client, tx) {
  const { id, created_at, ...changes } = transactionToRow(tx);
  const rows = check(await client.from('transactions').update(changes).eq('id', id).select('id'));
  if (rows.length === 0) throw new Error('Гүйлгээ олдсонгүй. Хуудсыг дахин ачаална уу.');
}

export async function deleteTransaction(client, id) {
  check(await client.from('transactions').delete().eq('id', id));
}

// --- Ангилал ---

export async function addCategory(client, category) {
  check(await client.from('categories').insert(categoryFromRow(category)));
}

export async function renameCategory(client, id, name) {
  check(await client.from('categories').update({ name }).eq('id', id));
}

// Төсөв нь сан дээр хамт устана (on delete cascade)
export async function deleteCategory(client, id) {
  check(await client.from('categories').delete().eq('id', id));
}

// --- Төсөв ---

// limit = null бол тухайн сарын төсвийг арилгана
export async function saveBudget(client, categoryId, month, limit) {
  if (limit === null) {
    check(await client.from('budgets').delete().eq('category_id', categoryId).eq('month', month));
  } else {
    await saveBudgets(client, [{ categoryId, month, limit }]);
  }
}

// Олон төсвийг нэг дор хадгална (байгаа бол шинэчилнэ)
export async function saveBudgets(client, budgets) {
  if (budgets.length === 0) return;
  check(
    await client
      .from('budgets')
      .upsert(budgets.map(budgetToRow), { onConflict: 'user_id,category_id,month' })
  );
}

// --- Бүх өгөгдлийг солих (нөөц оруулах, бүгдийг устгах) ---
// Сангийн нэг функц дотор хийгдэх тул дундаас тасарвал юу ч өөрчлөгдөхгүй.
export async function replaceAllData(client, data) {
  check(
    await client.rpc('replace_all_data', {
      payload: { categories: data.categories, transactions: data.transactions, budgets: data.budgets },
    })
  );
}
