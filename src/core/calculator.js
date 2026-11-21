import { DEFAULT_TIERS, DEFAULTS, EVENING_SCENARIOS } from './constants.js';

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizePrices(prices) {
  if (!Array.isArray(prices) || prices.length !== DEFAULT_TIERS.length) {
    return DEFAULT_TIERS.map((t) => t.price);
  }
  return prices.map((p, idx) => {
    const n = Number(p);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_TIERS[idx].price;
  });
}

export function sanitizeState(raw = {}) {
  return {
    name: typeof raw.name === 'string' ? raw.name : DEFAULTS.name,
    mode: raw.mode === 'kwh' ? 'kwh' : 'bill',
    bill: Math.max(0, Number.isFinite(Number(raw.bill)) ? Number(raw.bill) : DEFAULTS.bill),
    kwh: Math.max(0, Number.isFinite(Number(raw.kwh)) ? Number(raw.kwh) : DEFAULTS.kwh),
    eve: clamp(raw.eve, 0, 100, DEFAULTS.eve),
    dod: clamp(raw.dod, 50, 100, DEFAULTS.dod),
    eff: clamp(raw.eff, 70, 100, DEFAULTS.eff),
    mod: Math.max(0, Number.isFinite(Number(raw.mod)) ? Number(raw.mod) : DEFAULTS.mod),
    vat: clamp(raw.vat, 0, 30, DEFAULTS.vat),
    days: Math.round(clamp(raw.days, 1, 31, DEFAULTS.days)),
    prices: normalizePrices(raw.prices)
  };
}

// kWh -> tiền điện trước VAT (làm tròn đồng)
export function preVatFromKwh(kwh, prices) {
  const safePrices = normalizePrices(prices);
  let rest = Math.max(0, Number(kwh) || 0);
  let sum = 0;

  for (let i = 0; i < DEFAULT_TIERS.length; i++) {
    const use = Math.min(rest, DEFAULT_TIERS[i].size);
    sum += use * safePrices[i];
    rest -= use;
    if (rest <= 0) break;
  }
  return Math.round(sum);
}

// Tiền điện trước VAT -> kWh (nghịch đảo biểu giá bậc thang)
export function kwhFromPreVat(preVat, prices) {
  const safePrices = normalizePrices(prices);
  let rest = Math.max(0, Number(preVat) || 0);
  let used = 0;

  for (let i = 0; i < DEFAULT_TIERS.length; i++) {
    const { size } = DEFAULT_TIERS[i];
    const price = safePrices[i];

    if (price <= 0) {
      if (!Number.isFinite(size)) return used;
      used += size;
      continue;
    }

    const cost = size * price;
    if (rest <= cost) {
      used += rest / price;
      return used;
    }
    rest -= cost;
    used += size;
  }
  return used;
}

// Chi tiết từng bậc thang
export function tierBreakdown(kwh, prices) {
  const safePrices = normalizePrices(prices);
  let rest = Math.max(0, Number(kwh) || 0);

  return DEFAULT_TIERS.map((tierDef, i) => {
    const use = Math.min(rest, tierDef.size);
    rest -= use;
    return {
      tier: tierDef.tier,
      label: tierDef.label,
      price: safePrices[i],
      kwh: use,
      amount: use * safePrices[i]
    };
  });
}

// Dung lượng pin (kWh) = kWh/tháng × tỷ lệ tối ÷ (số ngày × DoD × hiệu suất xả)
export function batteryKwh(kwhMonth, eveRatio, dodRatio, effRatio, days) {
  const denom = days * dodRatio * effRatio;
  return denom > 0 ? (kwhMonth * eveRatio) / denom : 0;
}

export function suggestModules(batKwh, moduleCapacity) {
  if (batKwh <= 0 || moduleCapacity <= 0) return null;
  const count = Math.max(1, Math.ceil(batKwh / moduleCapacity - 1e-9));
  return {
    count,
    unitKwh: moduleCapacity,
    totalKwh: count * moduleCapacity
  };
}

// Hàm tổng hợp toàn bộ kết quả tư vấn (dùng chung cho UI và REST API)
export function calculateConsultation(rawInput = {}) {
  const state = sanitizeState(rawInput);
  const vatRatio = state.vat / 100;
  const eveRatio = state.eve / 100;
  const dodRatio = state.dod / 100;
  const effRatio = state.eff / 100;

  let kwhExact = 0;
  let kwhUsed = 0;
  let billTotal = 0;
  let preVatInput = 0;

  if (state.mode === 'bill') {
    preVatInput = state.bill / (1 + vatRatio);
    kwhExact = kwhFromPreVat(preVatInput, state.prices);
    kwhUsed = Math.round(kwhExact);
    billTotal = state.bill;
  } else {
    kwhExact = state.kwh;
    kwhUsed = state.kwh;
    preVatInput = preVatFromKwh(state.kwh, state.prices);
    billTotal = preVatInput + Math.round(preVatInput * vatRatio);
  }

  const hasData = kwhUsed > 0;
  const perDay = kwhUsed / state.days;
  const eveDay = perDay * eveRatio;
  const eveMonth = eveDay * state.days;
  const batKwh = batteryKwh(kwhUsed, eveRatio, dodRatio, effRatio, state.days);
  const modules = hasData ? suggestModules(batKwh, state.mod) : null;

  const tiers = tierBreakdown(kwhUsed, state.prices);
  const totalTierKwh = tiers.reduce((sum, r) => sum + r.kwh, 0);
  const totalTierAmount = tiers.reduce((sum, r) => sum + r.amount, 0);
  const preVatTier = preVatFromKwh(kwhUsed, state.prices);
  const vatTier = Math.round(preVatTier * vatRatio);
  const totalWithVatTier = preVatTier + vatTier;

  const scenarios = EVENING_SCENARIOS.map((percent) => {
    const ratio = percent / 100;
    const scenarioBat = batteryKwh(kwhUsed, ratio, dodRatio, effRatio, state.days);
    const scenarioEveDay = (kwhUsed / state.days) * ratio;
    const scenarioMod = hasData ? suggestModules(scenarioBat, state.mod) : null;

    return {
      evePercent: percent,
      isCurrent: percent === state.eve,
      eveDayKwh: scenarioEveDay,
      batteryKwh: scenarioBat,
      modules: scenarioMod
    };
  });

  return {
    state,
    hasData,
    summary: {
      kwhExact,
      kwhUsed,
      billTotal,
      preVatInput,
      perDay,
      eveDay,
      eveMonth,
      batteryKwh: batKwh,
      modules
    },
    breakdown: {
      tiers,
      totalKwh: totalTierKwh,
      totalAmount: totalTierAmount,
      preVat: preVatTier,
      vatAmount: vatTier,
      totalWithVat: totalWithVatTier
    },
    scenarios
  };
}