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
