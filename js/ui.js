// Дэлгэц зурах функцууд. Өгөгдлийг өөрчлөхгүй — зөвхөн харуулна, формоос уншина.
// Хэрэглэгчийн бичсэн текстийг (тайлбар г.м.) үргэлж textContent-ээр оруулна.
// innerHTML ашиглавал хортой код ажиллах эрсдэлтэй.

import { formatMoney } from './calc.js';

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

// Гүйлгээний жагсаалтыг зурна. Мөр дээр дарахад onSelect(id) дуудагдана.
export function renderTransactionList(listEl, countEl, transactions, categories, onSelect) {
  listEl.replaceChildren();

  if (transactions.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Гүйлгээ алга байна';
    listEl.append(empty);
    countEl.textContent = '';
    return;
  }

  countEl.textContent = `${transactions.length} гүйлгээ`;

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

    const cat = document.createElement('span');
    cat.className = 'tx-cat';
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = category?.color || '#9e9e9e';
    cat.append(dot, category?.name || 'Тодорхойгүй ангилал');

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
