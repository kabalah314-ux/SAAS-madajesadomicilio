// Playwright: login como admin y capturas de pantallas clave de MassFlow.
// Uso: node pw_shots.js  (dev server en http://localhost:5199)
const { chromium } = require('playwright');

const OUT = 'C:/Users/oscar/AppData/Local/Temp/claude/C--Users-oscar-Documents-Antigravity--claude-worktrees-vigilant-austin-c4f442/ef293282-6b6a-467f-8274-f77dfc516ca7/scratchpad';
const BASE = process.argv[2] || 'http://localhost:5199';

async function nav(page, name) {
  await page.locator(`nav button, aside button`).filter({ hasText: new RegExp('^' + name, 'i') }).first().click();
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const shots = [];

  await page.goto(BASE, { waitUntil: 'networkidle' });
  // Login admin
  await page.fill('input[type=email]', 'admin@massflow.app');
  await page.fill('input[type=password]', 'Test1234');
  await page.locator('form button[type=submit], button:has-text("Iniciar")').first().click();
  // Esperar a que el panel de admin cargue (aparece el menú lateral con "Transferencias").
  await page.waitForSelector('nav button:has-text("Transferencias"), aside button:has-text("Transferencias")', { timeout: 25000 });
  await page.waitForTimeout(1500);

  const p1 = `${OUT}/pw_1_dashboard.png`; await page.screenshot({ path: p1 }); shots.push(p1);

  // Agente → pestaña Análisis
  await nav(page, 'Agente');
  await page.getByRole('button', { name: 'Análisis' }).click();
  await page.waitForTimeout(2000);
  const p2 = `${OUT}/pw_2_agente_analisis.png`; await page.screenshot({ path: p2 }); shots.push(p2);

  // Transferencias (B3 bruto/neto)
  await nav(page, 'Transferencias');
  const p3 = `${OUT}/pw_3_transferencias.png`; await page.screenshot({ path: p3 }); shots.push(p3);

  console.log('SHOTS:', JSON.stringify(shots));
  console.log('titulo dashboard/heading actual:', await page.locator('h1,h2,h3').first().textContent().catch(() => '?'));
  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
