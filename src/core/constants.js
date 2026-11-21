export const STORAGE_KEY = 'hq_pin_tuvan_v2_5bac';

export const DEFAULT_TIERS = Object.freeze([
  { tier: 1, label: '0 – 100',   size: 100,      price: 1901 },
  { tier: 2, label: '101 – 200', size: 100,      price: 2289 },
  { tier: 3, label: '201 – 400', size: 200,      price: 2894 },
  { tier: 4, label: '401 – 700', size: 300,      price: 3456 },
  { tier: 5, label: 'Từ 701',    size: Infinity, price: 3844 }
]);

export const BILL_CHIPS = Object.freeze([1000000, 2000000, 3000000, 5000000, 8000000]);
export const KWH_CHIPS = Object.freeze([300, 500, 625, 1000, 1500]);
export const EVENING_SCENARIOS = Object.freeze([50, 60, 70, 80, 90]);

export const DEFAULTS = Object.freeze({
  name: '',
  mode: 'bill',
  bill: 2000000,
  kwh: 625,
  eve: 70,
  dod: 90,
  eff: 95,
  mod: 5.12,
  vat: 8,
  days: 30,
  prices: DEFAULT_TIERS.map((t) => t.price)
});

export const COMPANY_INFO = Object.freeze({
  pageTitle: 'Hoàng Quân – Tư vấn Pin lưu trữ Hybrid',
  brandAlt: 'Hoàng Quân – Electronics & Energy',
  heading: 'Tư vấn dung lượng Pin lưu trữ – Hệ thống Hybrid',
  subtitle: 'Từ hóa đơn tiền điện EVN của khách, quy đổi ra sản lượng kWh và tính dung lượng pin cần lưu cho buổi tối.',
  hotlines: [
    { display: '0913 350 597', tel: '0913350597' },
    { display: '0345 128 688', tel: '0345128688' }
  ],
  footerBrand: 'CTY HOÀNG QUÂN – Electronics & Energy · 0913 350 597 · 0345 128 688'
});