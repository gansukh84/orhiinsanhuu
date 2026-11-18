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
