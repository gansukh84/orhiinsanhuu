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
