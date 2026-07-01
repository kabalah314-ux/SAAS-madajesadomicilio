// Verifica en producción: (1) el registro público NO ofrece rol Masajista,
// (2) la sección admin "Accesos" (invitar masajista + promover admin).
const { chromium } = require('playwright');
const OUT = 'C:/Users/oscar/AppData/Local/Temp/claude/C--Users-oscar-Documents-Antigravity--claude-worktrees-vigilant-austin-c4f442/ef293282-6b6a-467f-8274-f77dfc516ca7/scratchpad';
const BASE = process.argv[2] || 'https://saas-madajesadomicilio.vercel.app';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

  // 1) Registro público
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Registrate/i }).click();
  await page.waitForTimeout(1000);
  const bodyReg = await page.evaluate(() => document.body.innerText);
  const ofreceMasajista = /Masajista/i.test(bodyReg) && /Tipo de cuenta/i.test(bodyReg);
  const notaCliente = /cuenta de\s*Cliente|por invitaci/i.test(bodyReg);
  await page.screenshot({ path: `${OUT}/pw_reg.png` });
  console.log('REGISTRO ofreceMasajista(selector):', ofreceMasajista, '| notaCliente:', notaCliente);

  // 2) Admin → Accesos
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', 'admin@massflow.app');
  await page.fill('input[type=password]', 'Test1234');
  await page.locator('form button[type=submit], button:has-text("Iniciar")').first().click();
  await page.waitForSelector('nav button:has-text("Accesos"), aside button:has-text("Accesos")', { timeout: 25000 });
  await page.locator('nav button, aside button').filter({ hasText: /^Accesos/ }).first().click();
  await page.waitForTimeout(1500);
  const bodyAcc = await page.evaluate(() => document.body.innerText);
  const tieneInvitar = /Invitar masajista/i.test(bodyAcc);
  const tieneAdmins = /Administradores/i.test(bodyAcc);
  const tieneHacerAdmin = /Hacer admin/i.test(bodyAcc);
  await page.screenshot({ path: `${OUT}/pw_accesos.png` });
  console.log('ACCESOS invitar:', tieneInvitar, '| administradores:', tieneAdmins, '| hacerAdmin:', tieneHacerAdmin);

  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
