// Дэлгэц зурах функцууд. Өгөгдлийг өөрчлөхгүй — зөвхөн харуулна, формоос уншина.
// Хэрэглэгчийн бичсэн текстийг (тайлбар г.м.) үргэлж textContent-ээр оруулна.
// innerHTML ашиглавал хортой код ажиллах эрсдэлтэй.

import { formatMoney, formatNumber } from './calc.js';

// Өнгөт цэг + ангиллын нэр (жагсаалт, төсөв, тохиргоонд дахин ашиглана)
function categoryBadge(category) {
  const wrap = document.createElement('span');
  wrap.className = 'tx-cat';
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = category?.color || '#9e9e9e';
  wrap.append(dot, category?.name || 'Тодорхойгүй ангилал');
  return wrap;
}

// Ангиллын нэр: ижил нэртэй (жишээ нь «Бусад») ангиллыг ялгахын тулд
// хэрэгтэй үед төрлийг хаалтанд нэмнэ.
function categoryLabel(category, withType) {
  if (!withType) return category.name;
  return `${category.name} (${category.type === 'income' ? 'орлого' : 'зарлага'})`;
}

// <select>-ийн сонголтуудыг ангиллаар дүүргэнэ.
// type өгвөл зөвхөн тэр төрлийн ангилал. allLabel өгвөл эхэнд «бүгд» сонголт нэмнэ.
export function renderCategoryOptions(select, categories, { type = '', selectedId = '', allLabel = '' } = {}) {
  select.replaceChildren();

  if (allLabel) {
    select.append(new Option(allLabel, ''));
  }

  const list = type ? categories.filter((c) => c.type === type) : categories;
  for (const category of list) {
    select.append(new Option(categoryLabel(category, !type), category.id));
  }

  // Өмнө сонгосон утга жагсаалтад байхгүй бол эхний сонголт руу шилжинэ
  const exists = [...select.options].some((o) => o.value === selectedId);
  select.value = exists ? selectedId : select.options[0]?.value ?? '';
}

// Хураангуйн гурван картыг бөглөнө. Үлдэгдэл сөрөг бол улаан болно.
export function renderSummaryCards(els, totals) {
  els.income.textContent = formatMoney(totals.income);
  els.expense.textContent = formatMoney(totals.expense);
  els.balance.textContent = formatMoney(totals.balance);
  els.balance.classList.toggle('negative', totals.balance < 0);
}

// Гүйлгээний жагсаалтыг зурна. Мөр дээр дарахад onSelect(id) дуудагдана.
// countEl заавал биш — өгвөл «N гүйлгээ» гэж бичнэ.
export function renderTransactionList(listEl, countEl, transactions, categories, onSelect) {
  listEl.replaceChildren();

  if (transactions.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Гүйлгээ алга байна';
    listEl.append(empty);
    if (countEl) countEl.textContent = '';
    return;
  }

  if (countEl) countEl.textContent = `${transactions.length} гүйлгээ`;

  // id-аар ангиллыг хурдан олохын тулд Map үүсгэнэ
  const byId = new Map(categories.map((c) => [c.id, c]));

  for (const tx of transactions) {
    const category = byId.get(tx.categoryId);

    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'tx-row';
    row.addEventListener('click', () => onSelect(tx.id));

    // Зүүн тал: ангилал + тайлбар
    const main = document.createElement('span');
    main.className = 'tx-main';

    const cat = categoryBadge(category);

    const note = document.createElement('span');
    note.className = 'tx-note';
    note.textContent = tx.note;

    main.append(cat, note);

    // Баруун тал: дүн + огноо
    const side = document.createElement('span');
    side.className = 'tx-side';

    const amount = document.createElement('span');
    amount.className = `tx-amount ${tx.type}`;
    amount.textContent = `${tx.type === 'income' ? '+' : '−'}${formatMoney(tx.amount)}`;

    const date = document.createElement('span');
    date.className = 'tx-date';
    date.textContent = tx.date;

    side.append(amount, date);
    row.append(main, side);

    const li = document.createElement('li');
    li.append(row);
    listEl.append(li);
  }
}

// Гүйлгээний цонхыг бөглөнө. tx нь засах гүйлгээ, эсвэл шинэ гүйлгээний анхны утгууд.
export function fillTransactionForm(form, tx, categories, isEdit) {
  form.querySelector('#tx-dialog-title').textContent = isEdit ? 'Гүйлгээ засах' : 'Гүйлгээ нэмэх';
  form.elements.type.value = tx.type;
  form.elements.amount.value = tx.amount ? String(tx.amount) : '';
  form.elements.date.value = tx.date;
  form.elements.note.value = tx.note || '';
  renderCategoryOptions(form.elements.categoryId, categories, { type: tx.type, selectedId: tx.categoryId });
  form.querySelector('#tx-delete').hidden = !isEdit;
  showFormErrors(form, []);
}

// Формын утгуудыг текстээр нь уншина (шалгалтыг calc.js хийнэ)
export function readTransactionForm(form) {
  return {
    type: form.elements.type.value,
    amount: form.elements.amount.value,
    date: form.elements.date.value,
    categoryId: form.elements.categoryId.value,
    note: form.elements.note.value.trim(),
  };
}

// Алдааны мессежүүдийг цонхонд харуулна (хоосон бол нууна)
export function showFormErrors(form, errors) {
  const box = form.querySelector('#tx-errors');
  box.replaceChildren();
  for (const message of errors) {
    const line = document.createElement('div');
    line.textContent = message;
    box.append(line);
  }
  box.hidden = errors.length === 0;
}

// ===== Төсөв (F5) =====

// Төсвийн жагсаалтыг зурна.
// rows: calc.js-ийн budgetRows()-ийн үр дүн
// onLimitChange(categoryId, текст) — хэрэглэгч хязгаар өөрчлөхөд дуудагдана
export function renderBudgetList(listEl, totalEl, rows, onLimitChange) {
  listEl.replaceChildren();

  for (const row of rows) {
    const li = document.createElement('li');
    li.className = 'budget-row';

    // Дээд мөр: ангилал | хязгаар оруулах талбар
    const head = document.createElement('div');
    head.className = 'budget-head';

    const input = document.createElement('input');
    input.className = 'budget-input';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.placeholder = 'Төсөв тавих';
    input.value = row.limit ? formatNumber(row.limit) : '';
    input.setAttribute('aria-label', `${row.category.name} — сарын төсөв`);
    // change: Enter дарах эсвэл талбараас гарахад нэг удаа ажиллана
    input.addEventListener('change', () => onLimitChange(row.category.id, input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });

    head.append(categoryBadge(row.category), input);

    // Доод мөр: зарцуулсан / хязгаар · хувь
    const info = document.createElement('div');
    info.className = 'budget-info';
    li.append(head, info);

    if (row.status) {
      info.textContent = `${formatMoney(row.spent)} / ${formatMoney(row.limit)} · ${row.status.percent}%`;
      info.classList.add(`level-${row.status.level}`);

      // Явцын зураас: 100%-иас хэтэрсэн ч зураас дүүрэн хэвээр (улаан)
      const track = document.createElement('div');
      track.className = 'progress';
      const bar = document.createElement('div');
      bar.className = `progress-bar level-${row.status.level}`;
      bar.style.width = `${Math.min(row.status.percent, 100)}%`;
      track.append(bar);
      li.append(track);
    } else {
      info.textContent = `Зарцуулсан ${formatMoney(row.spent)} · төсөв тавиагүй`;
    }

    listEl.append(li);
  }

  // Нийт: зөвхөн төсөв тавьсан ангиллуудаар
  const withBudget = rows.filter((r) => r.limit);
  if (withBudget.length === 0) {
    totalEl.textContent = 'Энэ сард төсөв тавиагүй байна.';
    return;
  }
  const limitSum = withBudget.reduce((sum, r) => sum + r.limit, 0);
  const spentSum = withBudget.reduce((sum, r) => sum + r.spent, 0);
  totalEl.textContent = `Нийт төсөв ${formatMoney(limitSum)} · Зарцуулсан ${formatMoney(spentSum)} · Үлдсэн ${formatMoney(limitSum - spentSum)}`;
}

// Хураангуй дээрх анхааруулга: төсөв хэтэрсэн (100%-иас их) ангиллууд
export function renderBudgetAlerts(container, rows) {
  const over = rows.filter((r) => r.status?.level === 'over');
  container.replaceChildren();
  container.hidden = over.length === 0;

  for (const row of over) {
    const line = document.createElement('div');
    line.textContent =
      `⚠ ${row.category.name}: төсвөөс ${formatMoney(row.spent - row.limit)} хэтэрсэн (${row.status.percent}%)`;
    container.append(line);
  }
}

// ===== Ангилал удирдах (F3) =====

// Орлого, зарлагын ангиллын жагсаалтыг зурна.
// counts: Map(categoryId → гүйлгээний тоо)
// handlers: { onRename(category), onDelete(category) }
export function renderCategoryManager(lists, categories, counts, handlers) {
  for (const type of ['expense', 'income']) {
    const listEl = lists[type];
    listEl.replaceChildren();

    for (const category of categories.filter((c) => c.type === type)) {
      const li = document.createElement('li');
      li.className = 'category-row';

      const info = document.createElement('span');
      info.className = 'category-info';
      const count = document.createElement('span');
      count.className = 'muted category-count';
      count.textContent = `${counts.get(category.id) || 0} гүйлгээ`;
      info.append(categoryBadge(category), count);

      const rename = document.createElement('button');
      rename.type = 'button';
      rename.className = 'btn btn-small';
      rename.textContent = 'Нэр солих';
      rename.addEventListener('click', () => handlers.onRename(category));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-small btn-danger';
      remove.textContent = 'Устгах';
      remove.addEventListener('click', () => handlers.onDelete(category));

      li.append(info, rename, remove);
      listEl.append(li);
    }
  }
}

// Ангиллын формын алдааг харуулна (хоосон текст бол нууна)
export function showCategoryError(box, message) {
  box.textContent = message || '';
  box.hidden = !message;
}
