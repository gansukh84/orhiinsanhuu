// Аппын эхлэх цэг: нэвтрэлт, өгөгдөл ачаалах, таб солих, гүйлгээ нэмэх/засах/устгах.
// Өгөгдөл Supabase-д хадгалагдана (js/config.js аль Supabase руу холбогдохыг шийднэ).
//
// Өөрчлөлт бүрийн дараалал:
//   1) шинэ утгыг бэлдэнэ  2) Supabase-д хадгална (await)  3) амжилттай бол л дэлгэцийн өгөгдлийг шинэчилнэ.
// Ингэснээр хадгалж чадаагүй өөрчлөлт дэлгэц дээр «хадгалагдсан» мэт харагдахгүй.
import { supabase, isConfigured } from './config.js';
import {
  loadData,
  hasStoredData,
  createDefaultData,
  exportData,
  parseBackup,
  backupFileName,
  fetchAllData,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  addCategory,
  renameCategory as renameCategoryInCloud,
  deleteCategory as deleteCategoryInCloud,
  saveBudget,
  saveBudgets,
  replaceAllData,
  friendlyError,
  OFFLINE_MESSAGE,
} from './storage.js';
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
  budgetRows,
  setBudget,
  copyBudgets,
  validateCategoryName,
  countCategoryTransactions,
  pickCategoryColor,
} from './calc.js';
import {
  renderCategoryOptions,
  renderTransactionList,
  renderSummaryCards,
  renderBudgetList,
  renderBudgetAlerts,
  renderCategoryManager,
  showCategoryError,
  fillTransactionForm,
  readTransactionForm,
  showFormErrors,
} from './ui.js';
import { renderCategoryChart, renderTrendChart } from './charts.js';

// Энд хүрсэн бол бүх модуль (Supabase сан ч) амжилттай ачаалагдсан.
// index.html дахь «Апп ачаалагдсангүй» мессеж гарахгүй болно.
window.appReady = true;

// ===== 1. Өгөгдөл ба хадгалалт =====
// Нэвтэрсэн хэрэглэгчийн өгөгдөл (Supabase-аас ачаалсны дараа дүүрнэ)
let data = { version: 1, transactions: [], categories: [], budgets: [] };
let currentUserId = null;

// Supabase-д хадгалах бүх үйлдлийг энэ функцээр дамжуулна.
// action: async функц. Амжилттай бол true, алдаатай бол монгол мессеж харуулаад false.
async function save(action) {
  if (!navigator.onLine) {
    alert(OFFLINE_MESSAGE);
    return false;
  }
  try {
    await action();
    return true;
  } catch (err) {
    console.warn('Хадгалах үед алдаа:', err.cause || err);
    alert(err.message || friendlyError(err));
    return false;
  }
}

// Давтагдашгүй ID. crypto.randomUUID байхгүй хуучин браузерт энгийн орлуулга ашиглана.
function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// JSON текстийг файл болгон татна
function downloadJson(text, fileName) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Зарим браузер татаж эхлэхээс өмнө холбоос устаж болох тул бага зэрэг хүлээнэ
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ===== 2. Төлвийн мөр: интернэт алга, ачаалж байна, алдаа =====
const statusBanner = document.getElementById('status-banner');
const statusText = document.getElementById('status-text');
const statusRetry = document.getElementById('status-retry');
const addButton = document.getElementById('add-btn');

// message хоосон бол нууна. onRetry өгвөл «Дахин оролдох» товч гарна.
function showStatus(message, { error = false, onRetry = null } = {}) {
  statusText.textContent = message || '';
  statusBanner.hidden = !message;
  statusBanner.classList.toggle('error', error);
  statusRetry.hidden = !onRetry;
  statusRetry.onclick = onRetry;
}

// Интернэт тасрах / сэргэхэд (0-р хэсэг, 4-р шийдвэр: «Холболт алга» гэж хэлнэ)
function updateOnlineState() {
  const online = navigator.onLine;
  addButton.disabled = !online;
  if (!online) {
    showStatus('Интернэт холболт алга. Өгөгдлийг харж болно, гэхдээ өөрчлөлт хадгалагдахгүй.');
  } else if (statusText.textContent.startsWith('Интернэт холболт алга')) {
    showStatus('');
  }
}
window.addEventListener('online', updateOnlineState);
window.addEventListener('offline', updateOnlineState);

// ===== 3. Нэвтрэлт (имэйлээр нэвтрэх холбоос) =====
const loginLoading = document.getElementById('login-loading');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');

function showLoginMessage(text, isError = false) {
  loginMessage.textContent = text;
  loginMessage.hidden = !text;
  loginMessage.classList.toggle('error', isError);
}

// Нэвтрэх холбоос дарсны дараа энэ хуудас руу буцна (localhost эсвэл GitHub Pages)
function redirectUrl() {
  return `${location.origin}${location.pathname}`;
}

// Холбоосын хугацаа дууссан г.м. алдааг хаягийн «#error=...» хэсгээс уншина
function readLinkError() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (!params.get('error')) return '';
  history.replaceState(null, '', redirectUrl());  // Хаягийг цэвэрлэнэ
  return 'Нэвтрэх холбоосын хугацаа дууссан эсвэл аль хэдийн ашиглагдсан байна. Шинэ холбоос хүснэ үү.';
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = loginForm.elements.email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showLoginMessage('Имэйл хаягаа зөв бичнэ үү.', true);
    return;
  }
  if (!navigator.onLine) {
    showLoginMessage('Интернэт холболт алга. Холболтоо шалгаад дахин оролдоно уу.', true);
    return;
  }

  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  showLoginMessage('Илгээж байна…');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectUrl() },
  });
  button.disabled = false;

  if (error) {
    console.warn('Нэвтрэх холбоос илгээж чадсангүй:', error);
    const tooMany = error.status === 429 || /rate limit/i.test(error.message);
    showLoginMessage(
      tooMany
        ? 'Имэйл илгээх хязгаарт хүрлээ. 1 цаг хүртэл хүлээгээд дахин оролдоно уу.'
        : friendlyError(error).replace('Хадгалж чадсангүй', 'Илгээж чадсангүй'),
      true
    );
    return;
  }
  showLoginMessage(`${email} хаяг руу нэвтрэх холбоос илгээлээ. Имэйлдээ ирсэн «Нэвтрэх» товч дээр дарна уу.`);
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  if (!confirm('Апп-аас гарах уу?')) return;
  await supabase.auth.signOut();  // Дараа нь onAuthStateChange нэвтрэх дэлгэц рүү шилжүүлнэ
});

// Нэвтрэлтийн төлөв өөрчлөгдөх бүрт (хуудас ачаалах, нэвтрэх, гарах) дуудагдана
async function handleSession(session) {
  const userId = session?.user?.id ?? null;
  if (userId === currentUserId && userId !== null) return;  // Токен шинэчлэгдсэн л бол юу ч хийхгүй
  currentUserId = userId;

  if (!userId) {
    data = { version: 1, transactions: [], categories: [], budgets: [] };
    document.body.dataset.auth = 'out';
    loginLoading.hidden = true;
    loginForm.hidden = false;
    showStatus('');
    return;
  }

  document.getElementById('account-email').textContent = session.user.email || '';
  document.body.dataset.auth = 'in';
  await loadFromCloud();
}

// Supabase-аас бүх өгөгдлийг ачаална
async function loadFromCloud() {
  showStatus('Өгөгдөл ачаалж байна…');
  try {
    data = await fetchAllData(supabase);
    showStatus('');
    updateOnlineState();
  } catch (err) {
    console.warn('Өгөгдөл ачаалж чадсангүй:', err.cause || err);
    showStatus(err.message, { error: true, onRetry: loadFromCloud });
  }
  renderAll();
}

// ===== 4. Таб солих =====
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

// ===== 5. Сар сонгогч =====
// Бүх таб энэ сарын өгөгдлийг харуулна. Анхдаа одоогийн сар.
let selectedMonth = currentMonth();

function setMonth(month) {
  selectedMonth = month;
  renderAll();
}

document.getElementById('month-prev').addEventListener('click', () => setMonth(shiftMonth(selectedMonth, -1)));
document.getElementById('month-next').addEventListener('click', () => setMonth(shiftMonth(selectedMonth, 1)));

// ===== 6. Хураангуй ба график (F4, F6) =====
const summaryCards = {
  income: document.getElementById('sum-income'),
  expense: document.getElementById('sum-expense'),
  balance: document.getElementById('sum-balance'),
};

function renderSummary() {
  renderSummaryCards(summaryCards, monthTotals(data.transactions, selectedMonth));
  renderBudgetAlerts(
    document.getElementById('budget-alerts'),
    budgetRows(data.transactions, data.categories, data.budgets, selectedMonth)
  );
  renderCategoryChart(
    document.getElementById('chart-categories'),
    expenseByCategory(data.transactions, selectedMonth, data.categories)
  );
  renderTrendChart(document.getElementById('chart-trend'), monthlyTrend(data.transactions, selectedMonth, 6));

  // Сонгосон сарын сүүлийн 5 гүйлгээ
  const recent = filterTransactions(data.transactions, { month: selectedMonth }).slice(0, 5);
  renderTransactionList(document.getElementById('recent-list'), null, recent, data.categories, openEditDialog);
}

// ===== 7. Гүйлгээний жагсаалт ба шүүлт (F7) =====
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

// ===== 8. Төсөв (F5) =====
function renderBudget() {
  renderBudgetList(
    document.getElementById('budget-list'),
    document.getElementById('budget-total'),
    budgetRows(data.transactions, data.categories, data.budgets, selectedMonth),
    onLimitChange
  );
}

// Хэрэглэгч ангиллын хязгаарыг өөрчлөхөд
async function onLimitChange(categoryId, text) {
  let limit = null;  // Хоосон бол төсвийг арилгана
  if (text.trim() !== '') {
    limit = parseAmount(text);
    if (limit === null) {
      alert('Төсөв 0-ээс их бүхэл тоо байх ёстой.');
      renderBudget();  // Буруу утгыг арилгаж, өмнөх утгыг сэргээнэ
      return;
    }
  }
  const month = selectedMonth;
  const ok = await save(() => saveBudget(supabase, categoryId, month, limit));
  if (ok) data.budgets = setBudget(data.budgets, categoryId, month, limit);
  renderAll();  // Амжилтгүй бол өмнөх утга буцаж харагдана
}

// «Өмнөх сарын төсвийг хуулах»
document.getElementById('copy-budget').addEventListener('click', async () => {
  const month = selectedMonth;
  const prevMonth = shiftMonth(month, -1);
  const source = data.budgets.filter((b) => b.month === prevMonth);
  if (source.length === 0) {
    alert(`${formatMonthLabel(prevMonth)}д төсөв тавиагүй байна.`);
    return;
  }
  const hasCurrent = data.budgets.some((b) => b.month === month);
  if (hasCurrent && !confirm('Энэ сарын төсөв өмнөх сарынхаар солигдоно. Үргэлжлүүлэх үү?')) {
    return;
  }
  const copied = source.map((b) => ({ ...b, month }));
  if (await save(() => saveBudgets(supabase, copied))) {
    data.budgets = copyBudgets(data.budgets, prevMonth, month).budgets;
    renderAll();
  }
});

// ===== 9. Ангилал удирдах (F3) =====
const categoryForm = document.getElementById('category-form');
const categoryError = document.getElementById('category-error');

function renderSettings() {
  const counts = new Map(
    data.categories.map((c) => [c.id, countCategoryTransactions(data.transactions, c.id)])
  );
  renderCategoryManager(
    {
      expense: document.getElementById('category-list-expense'),
      income: document.getElementById('category-list-income'),
    },
    data.categories,
    counts,
    { onRename: renameCategory, onDelete: deleteCategory }
  );
}

// Шинэ ангилал нэмэх
categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const type = categoryForm.elements.type.value;
  const name = categoryForm.elements.name.value.trim();
  const error = validateCategoryName(name, type, data.categories);
  if (error) {
    showCategoryError(categoryError, error);
    return;
  }
  const category = { id: makeId(), name, type, color: pickCategoryColor(data.categories) };
  if (await save(() => addCategory(supabase, category))) {
    data.categories.push(category);
    categoryForm.elements.name.value = '';
    showCategoryError(categoryError, '');
    renderAll();
  }
});

// Нэр солих
async function renameCategory(category) {
  const newName = prompt('Ангиллын шинэ нэр:', category.name);
  if (newName === null) return;  // «Болих» дарсан
  const error = validateCategoryName(newName, category.type, data.categories, category.id);
  if (error) {
    alert(error);
    return;
  }
  const name = newName.trim();
  if (await save(() => renameCategoryInCloud(supabase, category.id, name))) {
    category.name = name;
    renderAll();
  }
}

// Устгах — гүйлгээтэй бол зөвшөөрөхгүй (сан ч мөн хориглоно)
async function deleteCategory(category) {
  const count = countCategoryTransactions(data.transactions, category.id);
  if (count > 0) {
    alert(`«${category.name}» ангилалд ${count} гүйлгээ байгаа тул устгах боломжгүй. Эхлээд гүйлгээнүүдийг өөр ангилал руу шилжүүлэх эсвэл устгана уу.`);
    return;
  }
  if (!confirm(`«${category.name}» ангиллыг устгах уу?`)) return;
  if (await save(() => deleteCategoryInCloud(supabase, category.id))) {
    data.categories = data.categories.filter((c) => c.id !== category.id);
    data.budgets = data.budgets.filter((b) => b.categoryId !== category.id);  // Сан дээр ч хамт устсан
    renderAll();
  }
}

// ===== 10. Нөөц: JSON татах, оруулах (F8) =====

// Бүх өгөгдлийг .json файл болгон татна
document.getElementById('export-btn').addEventListener('click', () => {
  downloadJson(exportData(data), backupFileName());
});

// Өмнөх хувилбарт энэ төхөөрөмжийн localStorage-д хадгалсан өгөгдөл (байвал)
const legacyBackup = document.getElementById('legacy-backup');
legacyBackup.hidden = !hasStoredData();
document.getElementById('legacy-export-btn').addEventListener('click', () => {
  downloadJson(exportData(loadData()), backupFileName().replace('.json', '-huuchin.json'));
});

const importFile = document.getElementById('import-file');
document.getElementById('import-btn').addEventListener('click', () => importFile.click());

// Файл сонгогдсоны дараа: шалгах → баталгаажуулах → солих
importFile.addEventListener('change', async () => {
  const file = importFile.files[0];
  importFile.value = '';  // Ижил файлыг дахин сонгоход ч ажиллахын тулд
  if (!file) return;

  const result = parseBackup(await file.text());
  if (!result.ok) {
    // Алдаатай бол одоогийн өгөгдөлд огт хүрэхгүй
    alert(`Файлыг оруулж чадсангүй: ${result.error}\nОдоогийн өгөгдөл өөрчлөгдөөгүй.`);
    return;
  }

  const incoming = result.data;
  const ok = confirm(
    `Файлд ${incoming.transactions.length} гүйлгээ, ${incoming.categories.length} ангилал, ` +
    `${incoming.budgets.length} төсөв байна.\n\n` +
    `Одоогийн өгөгдөл (${data.transactions.length} гүйлгээ) бүхэлдээ солигдоно. Үргэлжлүүлэх үү?`
  );
  if (!ok) return;

  showStatus('Нөөц оруулж байна…');
  const saved = await save(() => replaceAllData(supabase, incoming));
  showStatus('');
  updateOnlineState();
  if (!saved) return;  // Алдааны мессежийг save() харуулсан, хуучин өгөгдөл хэвээр
  data = incoming;
  renderAll();
  alert('Нөөцийг амжилттай орууллаа.');
});

// ===== 11. Бүх өгөгдлийг устгах (давхар баталгаажуулалт) =====
document.getElementById('reset-btn').addEventListener('click', async () => {
  if (!confirm('Бүх гүйлгээ, төсөв, өөрийн нэмсэн ангилал устана. Үргэлжлүүлэх үү?')) return;
  // Хоёр дахь баталгаа: санамсаргүй дарахаас хамгаална
  const answer = prompt('Итгэлтэй байвал «УСТГАХ» гэж бичнэ үү. Өмнө нь нөөцөө татсан эсэхээ шалгаарай.');
  if (answer === null) return;
  if (answer.trim().toUpperCase() !== 'УСТГАХ') {
    alert('Бичсэн үг таарсангүй. Юу ч устгаагүй.');
    return;
  }
  const fresh = createDefaultData();  // Анхны 14 ангилалтай хоосон өгөгдөл
  if (!(await save(() => replaceAllData(supabase, fresh)))) return;
  data = fresh;
  renderAll();
  alert('Бүх өгөгдлийг устгалаа.');
});

// Сар, хураангуй, жагсаалт, төсөв, тохиргоо — бүгдийг дахин зурна
function renderAll() {
  document.getElementById('month-label').textContent = formatMonthLabel(selectedMonth);
  refreshFilterCategories();  // Ангилал нэмэгдсэн/устсан байж болно
  renderSummary();
  renderList();
  renderBudget();
  renderSettings();
}

// ===== 12. Гүйлгээ нэмэх / засах / устгах цонх (F1, F2) =====
const dialog = document.getElementById('tx-dialog');
const form = document.getElementById('tx-form');
const saveButton = form.querySelector('button[type="submit"]');
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

addButton.addEventListener('click', openAddDialog);
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
form.addEventListener('submit', async (event) => {
  event.preventDefault();  // Хуудас дахин ачаалагдахаас сэргийлнэ

  const raw = readTransactionForm(form);
  const values = { ...raw, amount: parseAmount(raw.amount) };
  const errors = validateTransaction(values, data.categories);
  if (errors.length > 0) {
    showFormErrors(form, errors);
    return;
  }

  // Хадгалж дуустал товчийг хаана — давхар дарахад давхар гүйлгээ үүсэхгүй
  saveButton.disabled = true;
  let ok;
  if (editingId) {
    // Засах: id, createdAt хэвээр, бусад талбарыг шинэчилнэ
    const index = data.transactions.findIndex((t) => t.id === editingId);
    const updated = { ...data.transactions[index], ...values };
    ok = await save(() => updateTransaction(supabase, updated));
    if (ok) data.transactions[index] = updated;
  } else {
    const tx = { id: makeId(), ...values, createdAt: new Date().toISOString() };
    ok = await save(() => addTransaction(supabase, tx));
    if (ok) data.transactions.push(tx);
  }
  saveButton.disabled = false;
  if (!ok) return;  // Цонх нээлттэй хэвээр — хэрэглэгч дахин оролдож болно

  // Гүйлгээ өөр сард бол тэр сар руу шилжинэ — хадгалсан гүйлгээ шууд харагдана
  selectedMonth = values.date.slice(0, 7);
  dialog.close();
  renderAll();  // Жагсаалт ба хураангуй хоёулаа шинэчлэгдэнэ (F1)
});

// Устгах — баталгаажуулсны дараа
document.getElementById('tx-delete').addEventListener('click', async () => {
  if (!editingId) return;
  if (!confirm('Энэ гүйлгээг устгах уу? Буцаах боломжгүй.')) return;
  const id = editingId;
  if (!(await save(() => deleteTransaction(supabase, id)))) return;
  data.transactions = data.transactions.filter((t) => t.id !== id);
  dialog.close();
  renderAll();
});

// ===== 13. Эхлэх =====
renderAll();
updateOnlineState();  // Интернэтгүй нээгдсэн бол шууд мэдэгдэнэ

if (!isConfigured) {
  // Үүлэн Supabase-ийн хаяг, түлхүүрийг js/config.js-д хараахан бичээгүй
  loginLoading.textContent = 'Апп хараахан тохируулагдаагүй байна (js/config.js).';
} else {
  const linkError = readLinkError();
  // onAuthStateChange нь эхлээд одоогийн төлөвийг (нэвтэрсэн эсэх) нэг удаа дуудна.
  // Дотор нь Supabase-ийг шууд await хийвэл гацах эрсдэлтэй тул setTimeout-оор салгана.
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(async () => {
      await handleSession(session);
      if (linkError && !session) showLoginMessage(linkError, true);
    }, 0);
  });
}
