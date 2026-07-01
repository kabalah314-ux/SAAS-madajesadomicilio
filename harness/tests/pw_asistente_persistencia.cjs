// Verifica que el contexto del chat NO se pierde al recargar (simula cerrar/reabrir ventana).
const { chromium } = require('playwright');
const OUT = 'C:/Users/oscar/AppData/Local/Temp/claude/C--Users-oscar-Documents-Antigravity--claude-worktrees-vigilant-austin-c4f442/ef293282-6b6a-467f-8274-f77dfc516ca7/scratchpad';
const BASE = process.argv[2] || 'http://localhost:5199';
const MARCA = 'Mensaje único de prueba ' + Math.random().toString(36).slice(2, 8);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', 'clienta@massflow.app');
  await page.fill('input[type=password]', 'Test1234');
  await page.locator('form button[type=submit], button:has-text("Iniciar")').first().click();
  await page.waitForSelector('nav button:has-text("Asistente"), aside button:has-text("Asistente")', { timeout: 25000 });

  await page.locator('nav button, aside button').filter({ hasText: /^Asistente/ }).first().click();
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder="Escribe tu mensaje…"]', MARCA);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(6000);
  let body = await page.evaluate(() => document.body.innerText);
  console.log('1) mensaje enviado y visible antes de recargar:', body.includes(MARCA));
  await page.screenshot({ path: `${OUT}/pw_persist_1_antes.png` });

  // Simular cierre/reapertura: recarga completa de la página (pierde TODO el estado de React).
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('nav button:has-text("Asistente"), aside button:has-text("Asistente")', { timeout: 25000 });
  await page.locator('nav button, aside button').filter({ hasText: /^Asistente/ }).first().click();
  await page.waitForTimeout(2500); // esperar a que cargue la conversación desde el servidor
  body = await page.evaluate(() => document.body.innerText);
  console.log('2) tras RECARGAR, el mensaje SIGUE visible (contexto no se pierde):', body.includes(MARCA));
  console.log('   botón "Nueva conversación" aparece (hay conversación activa):', /Nueva conversación/i.test(body));
  await page.screenshot({ path: `${OUT}/pw_persist_2_despues.png` });

  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
