// Аппын эхлэх цэг: өгөгдөл ачаалах, таб солих, гүйлгээ нэмэх/засах/устгах.
import { loadData, saveData, hasStoredData } from './storage.js';
import {
  parseAmount,
  validateTransaction,
  filterTransactions,
  todayISO,
  currentMonth,
  shiftMonth,
  formatMonthLabel,
  monthTotals,
  expenseByCategory,
  monthlyTrend,
} from './calc.js';
import {
  renderCategoryOptions,
  renderTransactionList,
  renderSummaryCards,
  fillTransactionForm,
  readTransactionForm,
  showFormErrors,
} from './ui.js';
import { renderCategoryChart, renderTrendChart } from './charts.js';

// ===== 1. Өгөгдөл ачаалах (F9) =====
// Анх удаа нээж байвал анхны ангиллуудтай өгөгдлийг шууд хадгална.
// Дараагийн удаа хадгалсан өгөгдөл localStorage-аас уншигдана.
const firstRun = !hasStoredData();
const data = loadData();
if (firstRun) {
  saveData(data);
}
console.log(
  `Манай төсөв ачааллаа: ${data.categories.length} ангилал, ${data.transactions.length} гүйлгээ`
);

// Өгөгдлийг хадгалаад, амжилтгүй бол хэрэглэгчид мэдэгдэнэ
function persist() {
  if (!saveData(data)) {
    alert('Өгөгдлийг хадгалж чадсангүй. Браузерын тохиргоог шалгана уу.');
  }
}

// Давтагдашгүй ID. crypto.randomUUID байхгүй хуучин браузерт энгийн орлуулга ашиглана.
function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// ===== 2. Таб солих =====
const tabButtons = document.querySelectorAll('.tab');

// Сонгосон табыг идэвхжүүлж, бусдыг нууна
function showTab(name) {
  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === name;
    btn.setAttribute('aria-selected', String(isActive));
    document.getElementById(`panel-${btn.dataset.tab}`).hidden = !isActive;
  });
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

// ===== 3. Сар сонгогч =====
// Бүх таб энэ сарын өгөгдлийг харуулна. Анхдаа одоогийн сар.
let selectedMonth = currentMonth();

function setMonth(month) {
  selectedMonth = month;
  renderAll();
}

document.getElementById('month-prev').addEventListener('click', () => setMonth(shiftMonth(selectedMonth, -1)));
document.getElementById('month-next').addEventListener('click', () => setMonth(shiftMonth(selectedMonth, 1)));

// ===== 4. Хураангуй ба график (F4, F6) =====
const summaryCards = {
  income: document.getElementById('sum-income'),
  expense: document.getElementById('sum-expense'),
  balance: document.getElementById('sum-balance'),
};

function renderSummary() {
  renderSummaryCards(summaryCards, monthTotals(data.transactions, selectedMonth));
  renderCategoryChart(
    document.getElementById('chart-categories'),
    expenseByCategory(data.transactions, selectedMonth, data.categories)
  );
  renderTrendChart(document.getElementById('chart-trend'), monthlyTrend(data.transactions, selectedMonth, 6));

  // Сонгосон сарын сүүлийн 5 гүйлгээ
  const recent = filterTransactions(data.transactions, { month: selectedMonth }).slice(0, 5);
  renderTransactionList(document.getElementById('recent-list'), null, recent, data.categories, openEditDialog);
}

// ===== 5. Гүйлгээний жагсаалт ба шүүлт (F7) =====
const filterType = document.getElementById('filter-type');
const filterCategory = document.getElementById('filter-category');
const filterSearch = document.getElementById('filter-search');
const txList = document.getElementById('tx-list');
const txCount = document.getElementById('tx-count');

// Ангиллын шүүлтүүрийг сонгосон төрөлд тааруулж дахин дүүргэнэ
function refreshFilterCategories() {
  renderCategoryOptions(filterCategory, data.categories, {
    type: filterType.value,
    selectedId: filterCategory.value,
    allLabel: 'Бүх ангилал',
  });
}

// Шүүлтүүрийн дагуу жагсаалтыг дахин зурна
function renderList() {
  const filtered = filterTransactions(data.transactions, {
    month: selectedMonth,
    type: filterType.value,
    categoryId: filterCategory.value,
    search: filterSearch.value,
  });
  renderTransactionList(txList, txCount, filtered, data.categories, openEditDialog);
}

filterType.addEventListener('change', () => {
  refreshFilterCategories();
  renderList();
});
filterCategory.addEventListener('change', renderList);
filterSearch.addEventListener('input', renderList);  // Бичих бүрт шууд хайна

// Сар, хураангуй, жагсаалт — бүгдийг дахин зурна
function renderAll() {
  document.getElementById('month-label').textContent = formatMonthLabel(selectedMonth);
  renderSummary();
  renderList();
}

// ===== 6. Гүйлгээ нэмэх / засах / устгах цонх (F1, F2) =====
const dialog = document.getElementById('tx-dialog');
const form = document.getElementById('tx-form');
let editingId = null;  // null = шинэ гүйлгээ, эс бөгөөс засаж буй гүйлгээний id

function openAddDialog() {
  editingId = null;
  fillTransactionForm(form, { type: 'expense', amount: '', date: todayISO(), categoryId: '', note: '' }, data.categories, false);
  dialog.showModal();
  form.elements.amount.focus();
}

function openEditDialog(id) {
  const tx = data.transactions.find((t) => t.id === id);
  if (!tx) return;
  editingId = id;
  fillTransactionForm(form, tx, data.categories, true);
  dialog.showModal();
}

document.getElementById('add-btn').addEventListener('click', openAddDialog);
document.getElementById('tx-cancel').addEventListener('click', () => dialog.close());

// Орлого/зарлага солиход ангиллын жагсаалт тухайн төрлийнх болно
form.querySelectorAll('input[name="type"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    renderCategoryOptions(form.elements.categoryId, data.categories, {
      type: form.elements.type.value,
      selectedId: form.elements.categoryId.value,
    });
  });
});

// Хадгалах
form.addEventListener('submit', (event) => {
  event.preventDefault();  // Хуудас дахин ачаалагдахаас сэргийлнэ

  const raw = readTransactionForm(form);
  const values = { ...raw, amount: parseAmount(raw.amount) };
  const errors = validateTransaction(values, data.categories);
  if (errors.length > 0) {
    showFormErrors(form, errors);
    return;
  }

  if (editingId) {
    // Засах: id, createdAt хэвээр, бусад талбарыг шинэчилнэ
    const index = data.transactions.findIndex((t) => t.id === editingId);
    data.transactions[index] = { ...data.transactions[index], ...values };
  } else {
    data.transactions.push({ id: makeId(), ...values, createdAt: new Date().toISOString() });
  }
  persist();

  // Гүйлгээ өөр сард бол тэр сар руу шилжинэ — хадгалсан гүйлгээ шууд харагдана
  selectedMonth = values.date.slice(0, 7);
  dialog.close();
  renderAll();  // Жагсаалт ба хураангуй хоёулаа шинэчлэгдэнэ (F1)
});

// Устгах — баталгаажуулсны дараа
document.getElementById('tx-delete').addEventListener('click', () => {
  if (!editingId) return;
  if (!confirm('Энэ гүйлгээг устгах уу? Буцаах боломжгүй.')) return;
  data.transactions = data.transactions.filter((t) => t.id !== editingId);
  persist();
  dialog.close();
  renderAll();
});

// ===== 7. Эхний зураг =====
refreshFilterCategories();
renderAll();
