// Тооцоо, шалгалт, шүүлтийн цэвэр функцууд.
// Энд DOM (document, window) огт ашиглахгүй — тиймээс Node дээр шууд тестлэж болно.

// Мөнгөн дүнг «1,250,000₮» хэлбэрээр харуулах форматлагч (нэг удаа үүсгээд дахин ашиглана)
const moneyFormatter = new Intl.NumberFormat('mn-MN');

// Дүнг мянгатын таслалтай, ₮ тэмдэгтэй текст болгоно.
// Жишээ: formatMoney(1250000) → "1,250,000₮"
export function formatMoney(amount) {
  return `${moneyFormatter.format(amount)}₮`;
}

// Хэрэглэгчийн оруулсан дүнг бүхэл тоо болгоно.
// "1,250,000", "1 250 000", "5000₮" зэргийг зөвшөөрнө.
// 0, сөрөг, бутархай, текст, хоосон бол null буцаана.
export function parseAmount(input) {
  if (typeof input === 'number') {
    return Number.isSafeInteger(input) && input > 0 ? input : null;
  }
  if (typeof input !== 'string') return null;

  // Хоосон зай, таслал, ₮ тэмдгийг арилгана
  const cleaned = input.replace(/[\s,₮]/g, '');
  // Зөвхөн цифр үлдсэн байх ёстой (хасах тэмдэг, цэг байвал татгалзана)
  if (!/^\d+$/.test(cleaned)) return null;

  const amount = Number(cleaned);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

// "YYYY-MM-DD" хэлбэртэй, бодитоор байх огноо эсэхийг шалгана.
// Жишээ: "2026-02-30" бол буруу (2-р сард 30 хоног байхгүй).
export function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

// Гүйлгээг шалгаад алдааны мессежүүдийн жагсаалт буцаана.
// Хоосон жагсаалт = гүйлгээ зөв.
export function validateTransaction(tx, categories) {
  const errors = [];

  if (tx.type !== 'income' && tx.type !== 'expense') {
    errors.push('Төрлөө (орлого эсвэл зарлага) сонгоно уу.');
  }
  if (!Number.isSafeInteger(tx.amount) || tx.amount <= 0) {
    errors.push('Дүн 0-ээс их бүхэл тоо байх ёстой.');
  }
  if (!isValidDate(tx.date)) {
    errors.push('Огноо буруу байна.');
  }
  // Ангилал байгаа бөгөөд гүйлгээний төрөлтэй таарч байх ёстой
  const category = categories.find((c) => c.id === tx.categoryId);
  if (!category || category.type !== tx.type) {
    errors.push('Ангилал сонгоно уу.');
  }
  if (tx.note !== undefined && typeof tx.note !== 'string') {
    errors.push('Тайлбар буруу байна.');
  }

  return errors;
}

// Гүйлгээнүүдийг шинэ огноо эхэнд байхаар эрэмбэлсэн ШИНЭ массив буцаана.
// Огноо ижил бол сүүлд нэмсэн нь эхэнд.
export function sortByDateDesc(transactions) {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

// Гүйлгээнүүдийг шүүгээд, шинэ огноо эхэнд байхаар буцаана.
// filters: { month: "YYYY-MM", type: "income"|"expense", categoryId, search }
// Хоосон утгатай шүүлтүүрийг тооцохгүй (= бүгд).
export function filterTransactions(transactions, filters = {}) {
  const { month = '', type = '', categoryId = '', search = '' } = filters;
  const query = search.trim().toLocaleLowerCase('mn');

  const result = transactions.filter((tx) => {
    if (month && !tx.date.startsWith(`${month}-`)) return false;
    if (type && tx.type !== type) return false;
    if (categoryId && tx.categoryId !== categoryId) return false;
    if (query && !(tx.note || '').toLocaleLowerCase('mn').includes(query)) return false;
    return true;
  });

  return sortByDateDesc(result);
}

// Өгсөн огнооны (анхдаа өнөөдөр) "YYYY-MM-DD" хэлбэр — орон нутгийн цагаар.
// toISOString() нь UTC цаг ашигладаг тул шөнө дунд өдөр буруу гарч болно, тиймээс гараар угсарна.
export function todayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Өгсөн огнооны (анхдаа өнөөдөр) сар: "YYYY-MM"
export function currentMonth(date = new Date()) {
  return todayISO(date).slice(0, 7);
}
