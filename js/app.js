// Аппын эхлэх цэг: өгөгдөл ачаалах, таб солих.
import { loadData, saveData, hasStoredData } from './storage.js';

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
