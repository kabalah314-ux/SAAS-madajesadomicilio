// Verifica la subida de foto de perfil para clienta y admin, y que se ve en el Header.
const { chromium } = require('playwright');
const path = require('path');
const OUT = 'C:/Users/oscar/AppData/Local/Temp/claude/C--Users-oscar-Documents-Antigravity--claude-worktrees-vigilant-austin-c4f442/ef293282-6b6a-467f-8274-f77dfc516ca7/scratchpad';
const BASE = process.argv[2] || 'http://localhost:5199';
const IMG = path.join(__dirname, 'test_avatar.png');

async function login(page, email) {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'Test1234');
  await page.locator('form button[type=submit], button:has-text("Iniciar")').first().click();
  await page.waitForTimeout(3000);
}

(async () => {
  const browser = await chromium.launch();

  // === CLIENTA ===
  const p1 = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  await login(p1, 'clienta@massflow.app');
  await p1.locator('nav button, aside button').filter({ hasText: /^Mis Datos/ }).first().click();
  await p1.waitForTimeout(1000);
  await p1.setInputFiles('input[type=file]', IMG);
  await p1.waitForTimeout(3000);
  await p1.screenshot({ path: `${OUT}/pw_avatar_1_clienta_datos.png` });
  let headerImg = await p1.locator('header img').count();
  console.log('CLIENTA: avatar en Header tras subir:', headerImg > 0);
  await p1.reload({ waitUntil: 'networkidle' });
  await p1.waitForTimeout(1500);
  headerImg = await p1.locator('header img').count();
  console.log('CLIENTA: avatar persiste tras recargar:', headerImg > 0);
  await p1.screenshot({ path: `${OUT}/pw_avatar_2_clienta_header.png` });

  // === ADMIN ===
  const p2 = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  await login(p2, 'admin@massflow.app');
  await p2.locator('nav button, aside button').filter({ hasText: /^Configuración/ }).first().click();
  await p2.waitForTimeout(1000);
  await p2.setInputFiles('input[type=file]', IMG);
  await p2.waitForTimeout(3000);
  await p2.screenshot({ path: `${OUT}/pw_avatar_3_admin_config.png` });
  let headerImgAdmin = await p2.locator('header img').count();
  console.log('ADMIN: avatar en Header tras subir:', headerImgAdmin > 0);

  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
