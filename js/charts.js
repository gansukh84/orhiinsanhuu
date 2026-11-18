// График зурах функцууд — гадны сангүй, гараар.
//  - Ангиллын зарлага: HTML багана (урт ангиллын нэр мөр шилжиж багтах тул)
//  - Сүүлийн 6 сар: SVG баганан график
// Өгөгдлийг calc.js-ийн функцууд бэлдэж өгнө, энд зөвхөн зурна.

import { formatMoney, formatCompactMoney, formatShortMonth } from './calc.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// SVG элемент үүсгэх туслах функц: svgEl('rect', { x: 0, y: 0 })
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

// Өгөгдөл байхгүй үеийн бичиг
function renderEmpty(container) {
  const p = document.createElement('p');
  p.className = 'chart-empty';
  p.textContent = 'Гүйлгээ алга байна';
  container.replaceChildren(p);
}

// ===== 1. Зарлага ангиллаар (хэвтээ багана) =====
// items: [{ name, color, amount }] — ихээс бага руу эрэмбэлсэн
export function renderCategoryChart(container, items) {
  if (items.length === 0) {
    renderEmpty(container);
    return;
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const max = items[0].amount;  // Хамгийн их нь 100% урттай
  const list = document.createElement('ul');
  list.className = 'cat-chart';

  for (const item of items) {
    const li = document.createElement('li');

    // Дээд мөр: өнгөт цэг + нэр | дүн (хувь)
    const head = document.createElement('div');
    head.className = 'cat-chart-head';

    const name = document.createElement('span');
    name.className = 'tx-cat';
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = item.color;
    name.append(dot, item.name);

    const value = document.createElement('span');
    value.className = 'cat-chart-value';
    const percent = Math.round((item.amount / total) * 100);
    value.textContent = `${formatMoney(item.amount)} · ${percent}%`;

    head.append(name, value);

    // Доод мөр: багана (хамгийн их зарлагатай харьцуулсан урт)
    const track = document.createElement('div');
    track.className = 'cat-chart-track';
    const bar = document.createElement('div');
    bar.className = 'cat-chart-bar';
    bar.style.width = `${(item.amount / max) * 100}%`;
    bar.style.background = item.color;
    track.append(bar);

    li.append(head, track);
    list.append(li);
  }

  container.replaceChildren(list);
}

// Тэнхлэгийн дээд утгыг «гоё» тоо болгоно: 1,730,000 → 2,000,000
// Шугам 4 хуваагддаг тул 4-т хуваахад тоймтой тоо гарах алхмуудыг сонгосон
// (жишээ нь 4 сая → 1, 2, 3, 4 сая).
function niceMax(value) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 4, 6, 8, 10]) {
    if (step * power >= value) return step * power;
  }
  return 10 * power;
}

// ===== 2. Сүүлийн 6 сар: орлого ба зарлага (SVG) =====
// trend: [{ month, income, expense }] — хуучнаас шинэ рүү
export function renderTrendChart(container, trend) {
  const hasData = trend.some((t) => t.income > 0 || t.expense > 0);
  if (!hasData) {
    renderEmpty(container);
    return;
  }

  // Зургийн хэмжээ (viewBox) — дэлгэцийн өргөнд тааруулж автоматаар томорч/жижгэрнэ
  const width = 360;
  const height = 200;
  const pad = { top: 10, right: 8, bottom: 24, left: 48 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const max = niceMax(Math.max(...trend.flatMap((t) => [t.income, t.expense])));
  const y = (value) => pad.top + chartH - (value / max) * chartH;  // Дүнг босоо байрлал болгоно

  const svg = svgEl('svg', {
    viewBox: `0 0 ${width} ${height}`,
    class: 'trend-chart',
    role: 'img',
    'aria-label': 'Сүүлийн 6 сарын орлого, зарлага',
  });

  // Хэвтээ туслах шугамууд ба дүнгийн шошго (0, 1/4, 1/2, 3/4, max)
  for (let i = 0; i <= 4; i++) {
    const value = (max / 4) * i;
    const lineY = y(value);
    svg.append(svgEl('line', {
      x1: pad.left, x2: width - pad.right, y1: lineY, y2: lineY, class: 'grid-line',
    }));
    const label = svgEl('text', { x: pad.left - 6, y: lineY + 4, class: 'axis-label', 'text-anchor': 'end' });
    label.textContent = formatCompactMoney(value);
    svg.append(label);
  }

  // Сар бүрт хоёр багана: орлого (ногоон), зарлага (улаан)
  const groupW = chartW / trend.length;
  const barW = Math.min(18, groupW * 0.32);
  const gap = 2;

  trend.forEach((t, i) => {
    const centerX = pad.left + groupW * i + groupW / 2;

    const bars = [
      { value: t.income, x: centerX - barW - gap / 2, cls: 'bar-income', label: 'Орлого' },
      { value: t.expense, x: centerX + gap / 2, cls: 'bar-expense', label: 'Зарлага' },
    ];
    for (const b of bars) {
      const top = y(b.value);
      const rect = svgEl('rect', {
        x: b.x, y: top, width: barW, height: pad.top + chartH - top, rx: 2, class: b.cls,
      });
      // Хулганаар заахад бүтэн дүн харагдана
      const title = svgEl('title');
      title.textContent = `${formatShortMonth(t.month)} · ${b.label}: ${formatMoney(b.value)}`;
      rect.append(title);
      svg.append(rect);
    }

    const monthLabel = svgEl('text', { x: centerX, y: height - 6, class: 'axis-label', 'text-anchor': 'middle' });
    monthLabel.textContent = formatShortMonth(t.month);
    svg.append(monthLabel);
  });

  // Тайлбар (legend)
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  legend.innerHTML =
    '<span><span class="dot" style="background:var(--income)"></span>Орлого</span>' +
    '<span><span class="dot" style="background:var(--expense)"></span>Зарлага</span>';

  container.replaceChildren(svg, legend);
}
