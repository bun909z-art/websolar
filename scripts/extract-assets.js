import fs from 'node:fs';
import path from 'node:path';

const sourceHtmlPath = process.argv[2] || 'HoangQuan_Tu_van_Pin_Luu_tru-1.html';
const outDir = path.resolve('public/images');

if (!fs.existsSync(sourceHtmlPath)) {
  console.error(`Không tìm thấy file nguồn: ${sourceHtmlPath}`);
  console.error('Cách dùng: npm run extract-assets -- ./duong-dan/HoangQuan_Tu_van_Pin_Luu_tru-1.html');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const html = fs.readFileSync(sourceHtmlPath, 'utf8');

const faviconMatch = html.match(/href="data:image\/png;base64,([^"]+)"/);
const logoMatch = html.match(/src="data:image\/jpeg;base64,([^"]+)"/);

if (faviconMatch) {
  fs.writeFileSync(path.join(outDir, 'favicon.png'), Buffer.from(faviconMatch[1], 'base64'));
  console.log('Đã tạo public/images/favicon.png');
}

if (logoMatch) {
  fs.writeFileSync(path.join(outDir, 'logo.jpg'), Buffer.from(logoMatch[1], 'base64'));
  console.log('Đã tạo public/images/logo.jpg');
}