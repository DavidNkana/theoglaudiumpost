import { chromium } from 'playwright';
import sharp from 'sharp';
import path from 'path';

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const out = path.resolve(here, '..', 'assets');

// Logo content (newspaper + "Laudium POST" wordmark). Wide viewBox so text never clips.
function logoSvg(bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400" width="3000" height="1200">
    <g transform="translate(123.517, 52.786)">
      <rect x="7" y="9" width="123.607" height="200" rx="10" ry="10" fill="none" stroke="${fg}" stroke-width="4.5"/>
      <rect x="0" y="0" width="123.607" height="200" rx="10" ry="10" fill="${bg}" stroke="${fg}" stroke-width="4.5"/>
      <text x="61.804" y="24" font-family="Georgia, 'Times New Roman', serif" font-size="20" font-weight="700" fill="${fg}" text-anchor="middle" letter-spacing="3">NEWS</text>
      <line x1="10" y1="32" x2="113.607" y2="32" stroke="${fg}" stroke-width="1.5"/>
      <rect x="10" y="38" width="47.210" height="76.393" rx="3" ry="3" fill="${fg}"/>
      <line x1="63.210" y1="48" x2="113.607" y2="48" stroke="${fg}" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="63.210" y1="62" x2="113.607" y2="62" stroke="${fg}" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="63.210" y1="76" x2="113.607" y2="76" stroke="${fg}" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="63.210" y1="90" x2="95" y2="90" stroke="${fg}" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="63.210" y1="104" x2="113.607" y2="104" stroke="${fg}" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="10" y1="130" x2="113.607" y2="130" stroke="${fg}" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="10" y1="148" x2="113.607" y2="148" stroke="${fg}" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="10" y1="166" x2="113.607" y2="166" stroke="${fg}" stroke-width="3.5" stroke-linecap="round"/>
      <line x1="10" y1="184" x2="68" y2="184" stroke="${fg}" stroke-width="3.5" stroke-linecap="round"/>
    </g>
    <g transform="translate(267.124, 0)">
      <text y="175" fill="${fg}">
        <tspan x="0" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-weight="700" letter-spacing="1">Laudium</tspan>
        <tspan dx="14" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-weight="700" letter-spacing="1">POST</tspan>
      </text>
    </g>
  </svg>`;
}

const CREAM = '#f5edd6';
const DARK = '#2c3e50';
const CANVAS = 2732;
const TARGET_W = 1700; // logo width on the splash canvas

const browser = await chromium.launch();

async function renderLogoTrimmed(bg, fg) {
  const page = await browser.newPage({ viewport: { width: 3000, height: 1200 }, deviceScaleFactor: 1 });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}html,body{background:transparent}svg{display:block}</style></head><body>${logoSvg(bg, fg)}</body></html>`;
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(150);
  const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 3000, height: 1200 } });
  await page.close();
  return sharp(buf).trim().toBuffer();
}

async function makeSplash(file, bgHex, bg, fg) {
  const logo = await renderLogoTrimmed(bg, fg);
  const meta = await sharp(logo).metadata();
  const w = TARGET_W;
  const h = Math.round((meta.height / meta.width) * w);
  const resized = await sharp(logo).resize(w, h).toBuffer();
  const c = bgHex.match(/\w\w/g).map(x => parseInt(x, 16));
  await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: c[0], g: c[1], b: c[2], alpha: 1 } } })
    .composite([{ input: resized, left: Math.round((CANVAS - w) / 2), top: Math.round((CANVAS - h) / 2) }])
    .png()
    .toFile(path.join(out, file));
  console.log('wrote', file);
}

await makeSplash('splash.png', 'f5edd6', CREAM, DARK);
await makeSplash('splash-dark.png', '2c3e50', DARK, CREAM);

await browser.close();
console.log('done');
