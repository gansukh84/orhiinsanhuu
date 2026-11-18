// calc.js-ийн тестүүд. Ажиллуулах: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMoney,
  parseAmount,
  isValidDate,
  validateTransaction,
  filterTransactions,
  todayISO,
  currentMonth,
  shiftMonth,
  formatMonthLabel,
  formatShortMonth,
  formatCompactMoney,
  monthTotals,
  expenseByCategory,
  monthlyTrend,
} from '../js/calc.js';
import { DEFAULT_CATEGORIES } from '../js/storage.js';

// Тестэд ашиглах жишээ гүйлгээ үүсгэгч
function tx(overrides) {
  return {
    id: 'x', type: 'expense', amount: 1000, date: '2026-11-15',
    categoryId: 'exp-food', note: '', createdAt: '2026-11-15T00:00:00.000Z',
    ...overrides,
  };
}

// ===== formatMoney =====
test('formatMoney: мянгатын таслал ба ₮', () => {
  assert.equal(formatMoney(1250000), '1,250,000₮');
  assert.equal(formatMoney(500), '500₮');
});

// ===== parseAmount =====
test('parseAmount: зөв дүнг бүхэл тоо болгоно', () => {
  assert.equal(parseAmount('25000'), 25000);
  assert.equal(parseAmount('1,250,000'), 1250000);
  assert.equal(parseAmount(' 1 250 000 '), 1250000);
  assert.equal(parseAmount('5000₮'), 5000);
  assert.equal(parseAmount(7), 7);
});

test('parseAmount: буруу дүнг (0, сөрөг, текст, бутархай, хоосон) татгалзана', () => {
  for (const bad of ['0', '-5', 'абв', '12.5', '', '   ', '1e5', 0, -100, 12.5, NaN, null, undefined]) {
    assert.equal(parseAmount(bad), null, `«${String(bad)}» татгалзагдах ёстой`);
  }
});

// ===== isValidDate =====
test('isValidDate: бодит огноог зөвшөөрч, байхгүйг татгалзана', () => {
  assert.equal(isValidDate('2026-11-30'), true);
  assert.equal(isValidDate('2028-02-29'), true);  // өндөр жил
  assert.equal(isValidDate('2026-02-29'), false);
  assert.equal(isValidDate('2026-13-01'), false);
  assert.equal(isValidDate('2026-1-5'), false);
  assert.equal(isValidDate(''), false);
});

// ===== validateTransaction =====
test('validateTransaction: зөв гүйлгээнд алдаа байхгүй', () => {
  assert.deepEqual(validateTransaction(tx({}), DEFAULT_CATEGORIES), []);
  assert.deepEqual(
    validateTransaction(tx({ type: 'income', categoryId: 'inc-salary' }), DEFAULT_CATEGORIES),
    []
  );
});

test('validateTransaction: дүн буруу бол алдаа', () => {
  for (const amount of [0, -1, 12.5, null, '1000']) {
    const errors = validateTransaction(tx({ amount }), DEFAULT_CATEGORIES);
    assert.ok(errors.some((e) => e.includes('Дүн')), `amount=${amount}`);
  }
});

test('validateTransaction: ангилал байхгүй эсвэл төрөлтэй таарахгүй бол алдаа', () => {
  assert.ok(validateTransaction(tx({ categoryId: 'байхгүй' }), DEFAULT_CATEGORIES).length > 0);
  // Зарлагын гүйлгээнд орлогын ангилал
  assert.ok(validateTransaction(tx({ categoryId: 'inc-salary' }), DEFAULT_CATEGORIES).length > 0);
});

test('validateTransaction: огноо, төрөл буруу бол алдаа', () => {
  assert.ok(validateTransaction(tx({ date: '2026-02-30' }), DEFAULT_CATEGORIES).length > 0);
  assert.ok(validateTransaction(tx({ type: 'other' }), DEFAULT_CATEGORIES).length > 0);
});

// ===== filterTransactions =====
const sample = [
  tx({ id: 'a', date: '2026-10-31', note: 'Сарын сүүл' }),
  tx({ id: 'b', date: '2026-11-01', note: 'Сарын эхэн' }),
  tx({ id: 'c', date: '2026-11-30', note: 'Талх, СҮҮ' }),
  tx({ id: 'd', date: '2026-12-01', note: '' }),
  tx({ id: 'e', date: '2026-11-15', type: 'income', categoryId: 'inc-salary', note: 'Цалин' }),
];

const ids = (list) => list.map((t) => t.id);

test('filterTransactions: сараар шүүхэд 1-ний болон сүүлийн өдөр орж, хөрш сар орохгүй', () => {
  assert.deepEqual(ids(filterTransactions(sample, { month: '2026-11' })), ['c', 'e', 'b']);
});

test('filterTransactions: шүүлтгүй бол бүгд, шинэ огноо эхэнд', () => {
  assert.deepEqual(ids(filterTransactions(sample)), ['d', 'c', 'e', 'b', 'a']);
});

test('filterTransactions: төрөл ба ангиллаар шүүнэ', () => {
  assert.deepEqual(ids(filterTransactions(sample, { type: 'income' })), ['e']);
  assert.deepEqual(ids(filterTransactions(sample, { categoryId: 'inc-salary' })), ['e']);
  assert.equal(filterTransactions(sample, { type: 'expense' }).length, 4);
});

test('filterTransactions: тайлбараас том/жижиг үсэг харгалзахгүй хайна', () => {
  // «Талх, СҮҮ» (том үсэг) ба «Сарын сүүл» хоёулаа «сүү»-г агуулна
  assert.deepEqual(ids(filterTransactions(sample, { search: 'сүү' })), ['c', 'a']);
  assert.deepEqual(ids(filterTransactions(sample, { search: 'ТАЛХ' })), ['c']);
  assert.deepEqual(ids(filterTransactions(sample, { search: '  САРЫН ' })), ['b', 'a']);
});

test('filterTransactions: ижил огноотой бол сүүлд нэмсэн нь эхэнд', () => {
  const list = [
    tx({ id: 'old', date: '2026-11-10', createdAt: '2026-11-10T08:00:00.000Z' }),
    tx({ id: 'new', date: '2026-11-10', createdAt: '2026-11-10T09:00:00.000Z' }),
  ];
  assert.deepEqual(ids(filterTransactions(list)), ['new', 'old']);
});

test('filterTransactions: анхны массивыг өөрчлөхгүй', () => {
  const copy = [...sample];
  filterTransactions(sample, { month: '2026-11' });
  assert.deepEqual(sample, copy);
});

// ===== todayISO, currentMonth =====
test('todayISO, currentMonth: орон нутгийн огноог зөв хэлбэрээр буцаана', () => {
  const date = new Date(2026, 0, 5, 23, 59); // 2026 оны 1-р сарын 5, 23:59
  assert.equal(todayISO(date), '2026-01-05');
  assert.equal(currentMonth(date), '2026-01');
});

// ===== Сартай ажиллах =====
test('shiftMonth: оны заагийг зөв давна', () => {
  assert.equal(shiftMonth('2026-11', 1), '2026-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-03', -5), '2025-10');
  assert.equal(shiftMonth('2026-05', 0), '2026-05');
});

test('formatMonthLabel, formatShortMonth: монгол шошго', () => {
  assert.equal(formatMonthLabel('2026-11'), '2026 оны 11-р сар');
  assert.equal(formatMonthLabel('2026-01'), '2026 оны 1-р сар');
  assert.equal(formatShortMonth('2026-06'), '6-р сар');
});

test('formatCompactMoney: сая, мянгаар товчилно', () => {
  assert.equal(formatCompactMoney(0), '0');
  assert.equal(formatCompactMoney(500), '500');
  assert.equal(formatCompactMoney(250000), '250 мян');
  assert.equal(formatCompactMoney(1500000), '1.5 сая');
  assert.equal(formatCompactMoney(2000000), '2 сая');
});

// ===== Сарын тооцоо =====
const monthSample = [
  tx({ id: '1', type: 'income', categoryId: 'inc-salary', amount: 2000000, date: '2026-11-01' }),  // сарын 1
  tx({ id: '2', type: 'expense', categoryId: 'exp-food', amount: 300000, date: '2026-11-30' }),    // сарын сүүлийн өдөр
  tx({ id: '3', type: 'expense', categoryId: 'exp-food', amount: 200000, date: '2026-11-15' }),
  tx({ id: '4', type: 'expense', categoryId: 'exp-housing', amount: 800000, date: '2026-11-05' }),
  tx({ id: '5', type: 'expense', categoryId: 'exp-food', amount: 99999, date: '2026-10-31' }),     // өмнөх сар
  tx({ id: '6', type: 'income', categoryId: 'inc-side', amount: 77777, date: '2026-12-01' }),      // дараагийн сар
];

test('monthTotals: орлого, зарлага, үлдэгдлийг зөв бодно', () => {
  assert.deepEqual(monthTotals(monthSample, '2026-11'), {
    income: 2000000, expense: 1300000, balance: 700000,
  });
});

test('monthTotals: өөр сарын гүйлгээ (31-ний, 1-ний өдөр) нийлбэрт орохгүй', () => {
  assert.deepEqual(monthTotals(monthSample, '2026-10'), { income: 0, expense: 99999, balance: -99999 });
  assert.deepEqual(monthTotals(monthSample, '2026-12'), { income: 77777, expense: 0, balance: 77777 });
});

test('monthTotals: гүйлгээгүй сард бүгд 0, зарлага их бол үлдэгдэл сөрөг', () => {
  assert.deepEqual(monthTotals([], '2026-11'), { income: 0, expense: 0, balance: 0 });
  assert.equal(monthTotals(monthSample, '2026-10').balance < 0, true);
});

test('expenseByCategory: ангиллаар нэгтгэж, ихээс бага руу эрэмбэлнэ', () => {
  const result = expenseByCategory(monthSample, '2026-11', DEFAULT_CATEGORIES);
  assert.deepEqual(result.map((r) => [r.categoryId, r.amount]), [
    ['exp-housing', 800000],
    ['exp-food', 500000],
  ]);
  assert.equal(result[1].name, 'Хоол хүнс');
  assert.deepEqual(expenseByCategory(monthSample, '2027-01', DEFAULT_CATEGORIES), []);
});

test('monthlyTrend: сүүлийн 6 сар, хуучнаас шинэ рүү, оны заагаар', () => {
  const trend = monthlyTrend(monthSample, '2027-01');
  assert.deepEqual(trend.map((t) => t.month), ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01']);
  assert.deepEqual(trend[3], { month: '2026-11', income: 2000000, expense: 1300000 });
  assert.deepEqual(trend[0], { month: '2026-08', income: 0, expense: 0 });
});
