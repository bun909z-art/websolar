import test from 'node:test';
import assert from 'node:assert/strict';
import {
  batteryKwh,
  calculateConsultation,
  kwhFromPreVat,
  preVatFromKwh
} from '../src/core/calculator.js';
import { DEFAULT_TIERS } from '../src/core/constants.js';

const PRICES = DEFAULT_TIERS.map((t) => t.price);

test('Tính tiền điện trước VAT cho 625 kWh đúng theo biểu giá 5 bậc', () => {
  // 100*1901 + 100*2289 + 200*2894 + 225*3456 = 1,775,400
  assert.equal(preVatFromKwh(625, PRICES), 1775400);
});

test('Quy đổi nghịch đảo từ tiền điện trước VAT về kWh chính xác', () => {
  const kwh = kwhFromPreVat(1775400, PRICES);
  assert.ok(Math.abs(kwh - 625) < 1e-9);
});

test('Tính dung lượng pin và gợi ý module ở chế độ kWh', () => {
  const res = calculateConsultation({
    mode: 'kwh',
    kwh: 625,
    eve: 70,
    dod: 90,
    eff: 95,
    days: 30,
    mod: 5.12,
    vat: 8
  });

  const expectedBat = batteryKwh(625, 0.7, 0.9, 0.95, 30);
  assert.ok(Math.abs(res.summary.batteryKwh - expectedBat) < 1e-9);
  assert.equal(res.summary.billTotal, 1917432);
  assert.equal(res.summary.modules.count, 4);
  assert.equal(res.summary.modules.totalKwh, 20.48);
});

test('Xử lý an toàn khi đầu vào bằng 0 hoặc đơn giá bậc bằng 0', () => {
  const res = calculateConsultation({ mode: 'bill', bill: 0, prices: [0, 0, 0, 0, 0] });
  assert.equal(res.hasData, false);
  assert.equal(res.summary.batteryKwh, 0);
  assert.equal(res.summary.modules, null);
});