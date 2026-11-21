// storage.js-ийн тестүүд. Ажиллуулах: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY,
  DEFAULT_CATEGORIES,
  createDefaultData,
  loadData,
  saveData,
  hasStoredData,
} from '../js/storage.js';

// localStorage-ийг дуурайсан энгийн объект (браузергүйгээр тестлэхэд)
function fakeStorage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

test('анхны ангиллууд: 10 зарлага, 4 орлого, id давхардахгүй', () => {
  const expense = DEFAULT_CATEGORIES.filter((c) => c.type === 'expense');
  const income = DEFAULT_CATEGORIES.filter((c) => c.type === 'income');
  assert.equal(expense.length, 10);
  assert.equal(income.length, 4);
  const ids = new Set(DEFAULT_CATEGORIES.map((c) => c.id));
  assert.equal(ids.size, DEFAULT_CATEGORIES.length);
});

test('хоосон storage-аас уншихад анхны өгөгдөл буцаана', () => {
  const storage = fakeStorage();
  const data = loadData(storage);
  assert.deepEqual(data, createDefaultData());
  assert.equal(data.categories.length, 14);
  assert.equal(hasStoredData(storage), false);
});

test('хадгалаад дахин уншихад ижил өгөгдөл гарна', () => {
  const storage = fakeStorage();
  const data = createDefaultData();
  data.transactions.push({
    id: 't1', type: 'expense', amount: 25000, date: '2026-11-18',
    categoryId: 'exp-food', note: 'Талх, сүү', createdAt: '2026-11-18T10:00:00.000Z',
  });
  assert.equal(saveData(data, storage), true);
  assert.equal(hasStoredData(storage), true);
  assert.deepEqual(loadData(storage), data);
});

test('эвдэрсэн JSON байвал апп унахгүй, анхны өгөгдөл буцаана', () => {
  const storage = fakeStorage({ [STORAGE_KEY]: '{эвдэрсэн' });
  assert.deepEqual(loadData(storage), createDefaultData());
});

test('бүтэц буруу (version өөр, массив дутуу) бол анхны өгөгдөл буцаана', () => {
  const wrongVersion = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ version: 99, transactions: [], categories: [], budgets: [] }) });
  assert.deepEqual(loadData(wrongVersion), createDefaultData());
  const missingArray = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, transactions: [] }) });
  assert.deepEqual(loadData(missingArray), createDefaultData());
});

test('createDefaultData нь DEFAULT_CATEGORIES-ийг өөрчлөхгүй хуулбар өгнө', () => {
  const data = createDefaultData();
  data.categories[0].name = 'Өөрчилсөн';
  assert.notEqual(DEFAULT_CATEGORIES[0].name, 'Өөрчилсөн');
});

// ===== JSON нөөц (F8) =====
import { exportData, parseBackup, backupFileName } from '../js/storage.js';

// Зөв өгөгдлийн жишээ
function sampleData() {
  const data = createDefaultData();
  data.transactions.push({
    id: 't1', type: 'expense', amount: 25000, date: '2026-11-18',
    categoryId: 'exp-food', note: 'Талх', createdAt: '2026-11-18T10:00:00.000Z',
  });
  data.budgets.push({ categoryId: 'exp-food', month: '2026-11', limit: 500000 });
  return data;
}

test('татаад буцааж оруулахад өгөгдөл яг хэвээрээ ирнэ', () => {
  const data = sampleData();
  const result = parseBackup(exportData(data));
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, data);
});

test('JSON биш файл татгалзагдана', () => {
  const result = parseBackup('энэ JSON биш');
  assert.equal(result.ok, false);
  assert.match(result.error, /JSON/);
});

test('өөр бүтэцтэй эсвэл өөр хувилбарын файл татгалзагдана', () => {
  assert.equal(parseBackup('[]').ok, false);
  assert.equal(parseBackup('null').ok, false);
  assert.equal(parseBackup(JSON.stringify({ ...sampleData(), version: 2 })).ok, false);
});

test('буруу гүйлгээтэй файл татгалзагдана (дүн, огноо, ангилал)', () => {
  const cases = [
    (t) => { t.amount = 0; },
    (t) => { t.amount = -500; },
    (t) => { t.amount = '5000'; },
    (t) => { t.amount = 12.5; },
    (t) => { t.date = '2026-13-01'; },
    (t) => { t.categoryId = 'baihgui'; },
    (t) => { t.type = 'income'; },  // Зарлагын ангилалтай орлого
  ];
  for (const breakIt of cases) {
    const data = sampleData();
    breakIt(data.transactions[0]);
    assert.equal(parseBackup(JSON.stringify(data)).ok, false);
  }
});

test('давхардсан id, буруу төсөв татгалзагдана', () => {
  const dupTx = sampleData();
  dupTx.transactions.push({ ...dupTx.transactions[0] });
  assert.equal(parseBackup(JSON.stringify(dupTx)).ok, false);

  const dupCat = sampleData();
  dupCat.categories.push({ ...dupCat.categories[0] });
  assert.equal(parseBackup(JSON.stringify(dupCat)).ok, false);

  const incomeBudget = sampleData();
  incomeBudget.budgets[0].categoryId = 'inc-salary';
  assert.equal(parseBackup(JSON.stringify(incomeBudget)).ok, false);

  const badMonth = sampleData();
  badMonth.budgets[0].month = '2026-11-01';
  assert.equal(parseBackup(JSON.stringify(badMonth)).ok, false);
});

test('алдаатай файл оруулахыг оролдоход хадгалсан өгөгдөл устахгүй', () => {
  const storage = fakeStorage();
  const data = sampleData();
  saveData(data, storage);
  const result = parseBackup('{эвдэрсэн');
  assert.equal(result.ok, false);
  // parseBackup storage-д хүрдэггүй тул өгөгдөл хэвээр
  assert.deepEqual(loadData(storage), data);
});

test('нөөц файлын нэр огноотой', () => {
  assert.equal(backupFileName(new Date(2026, 0, 5)), 'manai-tusuv-2026-01-05.json');
});

// ===== Үүлэн хадгалалт (Supabase) =====
import {
  transactionFromRow,
  transactionToRow,
  budgetFromRow,
  budgetToRow,
  friendlyError,
  OFFLINE_MESSAGE,
  fetchAllData,
  updateTransaction,
  addTransaction,
  PAGE_SIZE,
} from '../js/storage.js';

// Supabase client-ийг дуурайна: хүснэгт бүрийн мөрүүд + дуудлагын бүртгэл.
// from().select().order().range() / insert() / update().eq().select() гинжийг дэмжинэ.
function fakeClient(tables = {}, { error = null } = {}) {
  const calls = [];
  const client = {
    calls,
    from(table) {
      const q = { table, filters: [] };
      const result = (data) => Promise.resolve(error ? { data: null, error } : { data, error: null });
      const builder = {
        select() { return builder; },
        order() { return builder; },
        range(a, b) { return result((tables[table] || []).slice(a, b + 1)); },
        insert(row) { calls.push({ op: 'insert', table, row }); return result(null); },
        update(changes) { q.changes = changes; q.op = 'update'; return builder; },
        eq(col, val) {
          q.filters.push([col, val]);
          return {
            ...builder,
            select() {
              calls.push({ op: q.op, table, changes: q.changes, filters: q.filters });
              const rows = (tables[table] || []).filter((r) => q.filters.every(([c, v]) => r[c] === v));
              return result(rows.map((r) => ({ id: r.id })));
            },
          };
        },
      };
      return builder;
    },
  };
  return client;
}

const sampleRow = {
  user_id: 'u1', id: 't1', type: 'expense', amount: 25000, date: '2026-11-18',
  category_id: 'exp-food', note: 'Талх', created_at: '2026-11-18T10:00:00+00:00',
};

test('сангийн мөр ↔ гүйлгээ: хөрвүүлээд буцаахад ижил, user_id апп руу орохгүй', () => {
  const tx = transactionFromRow(sampleRow);
  assert.deepEqual(tx, {
    id: 't1', type: 'expense', amount: 25000, date: '2026-11-18',
    categoryId: 'exp-food', note: 'Талх', createdAt: '2026-11-18T10:00:00+00:00',
  });
  const { user_id, ...rowWithoutUser } = sampleRow;
  assert.deepEqual(transactionToRow(tx), rowWithoutUser);
});

test('тайлбаргүй гүйлгээ хоосон тайлбартай болно', () => {
  assert.equal(transactionFromRow({ ...sampleRow, note: null }).note, '');
  assert.equal(transactionToRow({ ...transactionFromRow(sampleRow), note: undefined }).note, '');
});

test('төсөв: limit ↔ limit_amount', () => {
  const b = { categoryId: 'exp-food', month: '2026-11', limit: 500000 };
  assert.deepEqual(budgetToRow(b), { category_id: 'exp-food', month: '2026-11', limit_amount: 500000 });
  assert.deepEqual(budgetFromRow({ user_id: 'u1', ...budgetToRow(b) }), b);
});

test('алдааны мессеж монголоор', () => {
  assert.equal(friendlyError(new TypeError('Failed to fetch')), OFFLINE_MESSAGE);
  assert.match(friendlyError({ code: '23505' }), /нэртэй ангилал/);
  assert.match(friendlyError({ code: '23503' }), /гүйлгээ байгаа/);
  assert.match(friendlyError({ code: 'PGRST301', message: 'JWT expired' }), /дахин нэвтэрнэ/);
  assert.match(friendlyError({ code: 'XXXXX' }), /Хадгалж чадсангүй/);
});

test('fetchAllData: бүх хүснэгтийг уншиж апп-ын хэлбэрт оруулна', async () => {
  const client = fakeClient({
    categories: [{ user_id: 'u1', id: 'exp-food', name: 'Хоол хүнс', type: 'expense', color: '#e76f51' }],
    transactions: [sampleRow],
    budgets: [{ user_id: 'u1', category_id: 'exp-food', month: '2026-11', limit_amount: 500000 }],
  });
  const data = await fetchAllData(client);
  assert.equal(data.version, 1);
  assert.deepEqual(data.categories, [{ id: 'exp-food', name: 'Хоол хүнс', type: 'expense', color: '#e76f51' }]);
  assert.equal(data.transactions[0].categoryId, 'exp-food');
  assert.equal(data.budgets[0].limit, 500000);
});

test('fetchAllData: 1000-аас олон гүйлгээг хэсэгчлэн бүгдийг уншина', async () => {
  const many = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => ({ ...sampleRow, id: `t${i}` }));
  const data = await fetchAllData(fakeClient({ transactions: many }));
  assert.equal(data.transactions.length, PAGE_SIZE + 5);
});

test('сангийн алдаа монгол мессежтэй Error болж шидэгдэнэ', async () => {
  const client = fakeClient({}, { error: { code: '23514', message: 'check violation' } });
  await assert.rejects(addTransaction(client, transactionFromRow(sampleRow)), /Утга буруу/);
});

test('updateTransaction: id, created_at-ийг өөрчлөхгүй; олдохгүй бол алдаа', async () => {
  const client = fakeClient({ transactions: [sampleRow] });
  await updateTransaction(client, { ...transactionFromRow(sampleRow), amount: 30000 });
  const call = client.calls.find((c) => c.op === 'update');
  assert.equal(call.changes.amount, 30000);
  assert.equal('id' in call.changes, false);
  assert.equal('created_at' in call.changes, false);

  await assert.rejects(
    updateTransaction(client, { ...transactionFromRow(sampleRow), id: 'baihgui' }),
    /олдсонгүй/
  );
});
