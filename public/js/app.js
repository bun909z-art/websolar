import {
  BILL_CHIPS,
  DEFAULT_TIERS,
  DEFAULTS,
  KWH_CHIPS,
  STORAGE_KEY
} from '/core/constants.js';
import { calculateConsultation, sanitizeState } from '/core/calculator.js';

const $ = (id) => document.getElementById(id);

const nf0 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return sanitizeState({ ...DEFAULTS, ...JSON.parse(raw) });
    }
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage hoặc dữ liệu hỏng
  }
  return sanitizeState(DEFAULTS);
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Bỏ qua lỗi quota / private mode
  }
}

function formatDigits(str) {
  const digits = String(str).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits ? nf0.format(Number(digits)) : '';
}

function setBillField(value) {
  $('bill').value = value ? nf0.format(value) : '';
}

function setRangeVisual(id, outId) {
  const el = $(id);
  const min = Number(el.min);
  const max = Number(el.max);
  const percent = ((Number(el.value) - min) / (max - min)) * 100;
  el.style.setProperty('--p', `${percent}%`);
  $(outId).textContent = `${el.value}%`;
}

function updatePrintDate() {
  $('pDate').textContent = new Date().toLocaleDateString('vi-VN');
}

function buildStaticControls() {
  $('billChips').innerHTML = BILL_CHIPS.map(
    (v) => `<button type="button" class="chip" data-bill="${v}">${nf0.format(v)}</button>`
  ).join('');

  $('kwhChips').innerHTML = KWH_CHIPS.map(
    (v) => `<button type="button" class="chip" data-kwh="${v}">${v} kWh</button>`
  ).join('');

  $('priceGrid').innerHTML = DEFAULT_TIERS.map(
    (t, i) => `
      <div>
        <div class="tl">Bậc ${t.tier} (${t.label})</div>
        <div class="field">
          <input type="number" inputmode="numeric" min="0" step="1" data-price="${i}">
        </div>
      </div>`
  ).join('');

  updatePrintDate();
}

let state = loadState();

function syncInputs() {
  $('name').value = state.name;
  setBillField(state.bill);
  $('kwh').value = state.kwh || '';
  $('eve').value = state.eve;
  $('dod').value = state.dod;
  $('eff').value = state.eff;
  $('mod').value = state.mod;
  $('vat').value = state.vat;
  $('days').value = state.days;

  document.querySelectorAll('[data-price]').forEach((el) => {
    el.value = state.prices[Number(el.dataset.price)];
  });
}

function render() {
  saveState(state);

  const result = calculateConsultation(state);
  const { hasData, summary, breakdown, scenarios } = result;
  const s = result.state;
  const isBill = s.mode === 'bill';

  // Chế độ nhập & thanh trượt
  $('modeBill').setAttribute('aria-pressed', String(isBill));
  $('modeKwh').setAttribute('aria-pressed', String(!isBill));
  $('billBox').hidden = !isBill;
  $('kwhBox').hidden = isBill;

  setRangeVisual('eve', 'eveOut');
  setRangeVisual('dod', 'dodOut');
  setRangeVisual('eff', 'effOut');
  $('pName').textContent = s.name || '—';

  // Chỉ số sản lượng & hóa đơn
  $('sKwh').textContent = hasData ? nf0.format(summary.kwhUsed) : '—';
  $('sKwhNote').textContent = isBill
    ? (s.bill > 0 ? `Quy đổi ≈ ${nf2.format(summary.kwhExact)} → làm tròn` : '\u00A0')
    : 'Số khách cung cấp';

  $('sBill').textContent = summary.billTotal > 0 ? nf0.format(summary.billTotal) : '—';
  $('sBillNote').textContent = isBill
    ? 'Số tiền khách cung cấp'
    : (s.kwh > 0 ? `Trước VAT ${nf0.format(summary.preVatInput)} đ` : '\u00A0');

  // Kết quả dung lượng pin & gợi ý module
  $('rBat').textContent = hasData ? nf1.format(summary.batteryKwh) : '—';
  if (hasData && summary.modules) {
    const { count, unitKwh, totalKwh } = summary.modules;
    $('rMods').innerHTML =
      `Gợi ý cấu hình: <b>${count} module × ${nf2.format(unitKwh)} kWh = ${nf2.format(totalKwh)} kWh</b>`;
  } else {
    $('rMods').textContent = hasData
      ? 'Nhập dung lượng module để xem gợi ý cấu hình.'
      : 'Nhập hóa đơn hoặc số kWh để bắt đầu.';
  }

  // Thanh tỷ lệ ngày / tối
  $('barDay').textContent = `${100 - s.eve}%`;
  $('barEve').textContent = `${s.eve}%`;
  $('barDay').style.width = `${100 - s.eve}%`;
  $('barEve').style.width = `${s.eve}%`;
  $('barHint').textContent = hasData
    ? `Buổi tối ≈ ${nf2.format(summary.eveDay)} kWh/ngày ≈ ${nf0.format(summary.eveMonth)} kWh/tháng`
    : '\u00A0';

  // Diễn giải từng bước
  $('v1').textContent = hasData ? `${nf2.format(summary.perDay)} kWh` : '—';
  $('e1').textContent = hasData ? `${nf0.format(summary.kwhUsed)} kWh ÷ ${s.days} ngày` : 'kWh tháng ÷ số ngày';
  $('v2').textContent = hasData ? `${nf2.format(summary.eveDay)} kWh` : '—';
  $('e2').textContent = hasData ? `${nf2.format(summary.perDay)} × ${s.eve}%` : '× tỷ lệ buổi tối';
  $('v3').textContent = hasData ? `${nf2.format(summary.batteryKwh)} kWh` : '—';
  $('e3').textContent = hasData ? `${nf2.format(summary.eveDay)} ÷ (${s.dod}% × ${s.eff}%)` : '\u00A0';

  // Bảng chi tiết 5 bậc thang
  const tierRowsHtml = breakdown.tiers.map((row) => {
    const dimClass = row.kwh <= 0 ? ' class="dim"' : '';
    return `
      <tr>
        <td><span class="bdg">${row.tier}</span>Bậc ${row.tier}</td>
        <td>${row.label}</td>
        <td>${nf0.format(row.price)}</td>
        <td${dimClass}>${nf0.format(Math.round(row.kwh * 100) / 100)}</td>
        <td${dimClass}>${nf0.format(Math.round(row.amount))}</td>
      </tr>`;
  }).join('');

  $('tierBody').innerHTML =
    tierRowsHtml +
    `<tr class="total">
      <td colspan="3">Cộng tiền điện (chưa VAT)</td>
      <td>${nf0.format(Math.round(breakdown.totalKwh * 100) / 100)}</td>
      <td>${nf0.format(Math.round(breakdown.totalAmount))}</td>
    </tr>`;

  $('tierNote').textContent = hasData
    ? `Tiền điện ${nf0.format(breakdown.preVat)} đ + VAT ${s.vat}% (${nf0.format(breakdown.vatAmount)} đ) = ${nf0.format(breakdown.totalWithVat)} đ cho ${nf0.format(summary.kwhUsed)} kWh.`
    : 'Nhập số liệu để xem chi tiết từng bậc.';

  // Bảng kịch bản tỷ lệ buổi tối
  $('scBody').innerHTML = scenarios.map((sc) => {
    const modText = sc.modules
      ? `${sc.modules.count} × ${nf2.format(sc.modules.unitKwh)} kWh`
      : '—';
    return `
      <tr${sc.isCurrent ? ' class="cur"' : ''}>
        <td>${sc.evePercent}%</td>
        <td>${hasData ? nf2.format(sc.eveDayKwh) : '—'}</td>
        <td>${hasData ? nf1.format(sc.batteryKwh) : '—'}</td>
        <td>${modText}</td>
      </tr>`;
  }).join('');
}

function bindEvents() {
  $('bill').addEventListener('input', (e) => {
    const el = e.target;
    const pos = el.selectionStart ?? el.value.length;
    const digitsBefore = el.value.slice(0, pos).replace(/\D/g, '').length;
    el.value = formatDigits(el.value);

    let seen = 0;
    let nextPos = 0;
    while (nextPos < el.value.length && seen < digitsBefore) {
      if (/\d/.test(el.value[nextPos])) seen++;
      nextPos++;
    }
    try {
      el.setSelectionRange(nextPos, nextPos);
    } catch {
      // Một số trình duyệt di động không hỗ trợ setSelectionRange
    }

    state.bill = Number(el.value.replace(/\D/g, '')) || 0;
    render();
  });

  $('kwh').addEventListener('input', (e) => {
    state.kwh = Math.max(0, parseFloat(e.target.value) || 0);
    render();
  });

  $('name').addEventListener('input', (e) => {
    state.name = e.target.value;
    render();
  });

  ['eve', 'dod', 'eff'].forEach((id) => {
    $(id).addEventListener('input', (e) => {
      state[id] = Number(e.target.value);
      render();
    });
  });

  $('mod').addEventListener('input', (e) => {
    state.mod = parseFloat(e.target.value) || 0;
    render();
  });

  $('vat').addEventListener('input', (e) => {
    state.vat = Math.max(0, parseFloat(e.target.value) || 0);
    render();
  });

  $('days').addEventListener('input', (e) => {
    state.days = Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 30));
    render();
  });

  document.querySelectorAll('[data-price]').forEach((el) => {
    el.addEventListener('input', (e) => {
      state.prices[Number(el.dataset.price)] = Math.max(0, parseFloat(e.target.value) || 0);
      render();
    });
  });

  $('modeBill').addEventListener('click', () => {
    state.mode = 'bill';
    render();
  });

  $('modeKwh').addEventListener('click', () => {
    state.mode = 'kwh';
    render();
  });

  document.body.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    if (chip.dataset.bill) {
      state.bill = Number(chip.dataset.bill);
      setBillField(state.bill);
    }
    if (chip.dataset.kwh) {
      state.kwh = Number(chip.dataset.kwh);
      $('kwh').value = state.kwh;
    }
    render();
  });

  $('reset').addEventListener('click', () => {
    state = sanitizeState(DEFAULTS);
    syncInputs();
    render();
  });

  $('print').addEventListener('click', () => {
    updatePrintDate();
    window.print();
  });

  window.addEventListener('beforeprint', updatePrintDate);
}

buildStaticControls();
syncInputs();
bindEvents();
render();