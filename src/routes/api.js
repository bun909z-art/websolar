import { Router } from 'express';
import {
  BILL_CHIPS,
  DEFAULT_TIERS,
  DEFAULTS,
  EVENING_SCENARIOS,
  KWH_CHIPS
} from '../core/constants.js';
import { calculateConsultation } from '../core/calculator.js';

const router = Router();

router.get('/defaults', (_req, res) => {
  res.json({
    ok: true,
    data: {
      defaults: DEFAULTS,
      tiers: DEFAULT_TIERS.map(({ tier, label, size, price }) => ({
        tier,
        label,
        size: Number.isFinite(size) ? size : null,
        price
      })),
      billChips: BILL_CHIPS,
      kwhChips: KWH_CHIPS,
      eveningScenarios: EVENING_SCENARIOS
    }
  });
});

router.post('/calculate', (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Dữ liệu đầu vào không hợp lệ.' });
  }

  const result = calculateConsultation(req.body);
  return res.json({ ok: true, data: result });
});

export default router;