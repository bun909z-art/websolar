import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPANY_INFO, DEFAULT_TIERS } from './src/core/constants.js';
import apiRouter from './src/routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware bảo mật & tối ưu truyền tải
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '32kb' }));

// View engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Tài nguyên tĩnh & chia sẻ module lõi tính toán cho trình duyệt
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));
app.use('/core', express.static(path.join(__dirname, 'src', 'core'), { maxAge: '1d' }));

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', apiRouter);

app.get('/', (_req, res) => {
  res.render('index', {
    company: COMPANY_INFO,
    tiers: DEFAULT_TIERS
  });
});

// 404 & Error handler
app.use((_req, res) => {
  res.status(404).send('Không tìm thấy trang yêu cầu.');
});

app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ ok: false, error: 'Lỗi hệ thống nội bộ.' });
});

app.listen(PORT, HOST, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});