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

// ===== Сартай ажиллах =====

// Сарыг delta-аар шилжүүлнэ. Жишээ: shiftMonth("2026-01", -1) → "2025-12"
// Санаа: сарыг «нийт хэдэн сар» болгоод нэмж хасаад, буцааж он-сар болгоно.
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  const mon = (total % 12) + 1;
  return `${year}-${String(mon).padStart(2, '0')}`;
}

// "2026-11" → "2026 оны 11-р сар"
export function formatMonthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return `${y} оны ${m}-р сар`;
}

// "2026-11" → "11-р сар" (графикийн богино шошго)
export function formatShortMonth(month) {
  return `${Number(month.split('-')[1])}-р сар`;
}

// Графикийн тэнхлэгт зориулсан товч дүн: 1500000 → "1.5 сая", 250000 → "250 мян"
export function formatCompactMoney(amount) {
  if (amount >= 1_000_000) {
    return `${Number((amount / 1_000_000).toFixed(1))} сая`;
  }
  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)} мян`;
  }
  return String(amount);
}

// ===== Сарын тооцоо (F4, F6) =====

// Тухайн сарын нийт орлого, зарлага, үлдэгдэл
export function monthTotals(transactions, month) {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (!tx.date.startsWith(`${month}-`)) continue;  // Өөр сарын гүйлгээг алгасна
    if (tx.type === 'income') income += tx.amount;
    else if (tx.type === 'expense') expense += tx.amount;
  }
  return { income, expense, balance: income - expense };
}

// Тухайн сарын зарлагыг ангиллаар нэгтгэнэ — ихээс бага руу эрэмбэлсэн.
// Буцаах: [{ categoryId, name, color, amount }]
export function expenseByCategory(transactions, month, categories) {
  const sums = new Map();
  for (const tx of transactions) {
    if (tx.type !== 'expense' || !tx.date.startsWith(`${month}-`)) continue;
    sums.set(tx.categoryId, (sums.get(tx.categoryId) || 0) + tx.amount);
  }

  const byId = new Map(categories.map((c) => [c.id, c]));
  return [...sums.entries()]
    .map(([categoryId, amount]) => {
      const category = byId.get(categoryId);
      return {
        categoryId,
        name: category?.name || 'Тодорхойгүй ангилал',
        color: category?.color || '#9e9e9e',
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

// endMonth хүртэлх сүүлийн count сарын орлого, зарлага (хуучнаас шинэ рүү).
// Буцаах: [{ month, income, expense }]
export function monthlyTrend(transactions, endMonth, count = 6) {
  const result = [];
  for (let i = count - 1; i >= 0; i--) {
    const month = shiftMonth(endMonth, -i);
    const { income, expense } = monthTotals(transactions, month);
    result.push({ month, income, expense });
  }
  return result;
}
