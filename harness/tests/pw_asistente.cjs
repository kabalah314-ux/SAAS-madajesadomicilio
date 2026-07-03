// Verifica el chat "Asistente" de la clienta: login, abrir chat, preguntar, reservar.
const { chromium } = require('playwright');
const OUT = 'C:/Users/oscar/AppData/Local/Temp/claude/C--Users-oscar-Documents-Antigravity--claude-worktrees-vigilant-austin-c4f442/ef293282-6b6a-467f-8274-f77dfc516ca7/scratchpad';
const BASE = process.argv[2] || 'http://localhost:5199';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', 'clienta@massflow.app');
  await page.fill('input[type=password]', 'Test1234');
  await page.locator('form button[type=submit], button:has-text("Iniciar")').first().click();
  await page.waitForSelector('nav button:has-text("Asistente"), aside button:has-text("Asistente")', { timeout: 25000 });
  console.log('LOGIN OK, menú "Asistente" visible');

  await page.locator('nav button, aside button').filter({ hasText: /^Asistente/ }).first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/pw_asis_1_abierto.png` });

  const bienvenida = await page.evaluate(() => document.body.innerText);
  console.log('pantalla de chat abierta:', /Asistente|Pregunta lo que quieras/i.test(bienvenida));

  // Preguntar algo
  await page.fill('input[placeholder="Escribe tu mensaje…"]', '¿Qué servicios tenéis y cuánto cuestan?');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(6000);
  const bodyPregunta = await page.evaluate(() => document.body.innerText);
  console.log('respuesta con precio real (55):', bodyPregunta.includes('55'));
  await page.screenshot({ path: `${OUT}/pw_asis_2_pregunta.png` });

  // Pedir cita completa en un solo mensaje
  await page.fill('input[placeholder="Escribe tu mensaje…"]', 'Quiero reservar un relajante el 2026-10-12 a las 11:00, dirección Calle Playwright 9, barrio Centro. Confírmalo.');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(9000);
  let body = await page.evaluate(() => document.body.innerText);
  if (!/MF-\d{6}/.test(body)) {
    await page.fill('input[placeholder="Escribe tu mensaje…"]', 'Sí, confirmo.');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(7000);
    body = await page.evaluate(() => document.body.innerText);
  }
  const codigoMatch = body.match(/MF-\d{6}/);
  console.log('reserva confirmada por chat, código:', codigoMatch ? codigoMatch[0] : 'NO ENCONTRADO');
  await page.screenshot({ path: `${OUT}/pw_asis_3_reserva.png` });

  // Verificar que aparece en Mis Reservas
  await page.locator('nav button, aside button').filter({ hasText: /^Mis Reservas/ }).first().click();
  await page.waitForTimeout(1500);
  const bodyReservas = await page.evaluate(() => document.body.innerText);
  console.log('aparece en Mis Reservas:', codigoMatch ? bodyReservas.includes(codigoMatch[0]) : false);
  await page.screenshot({ path: `${OUT}/pw_asis_4_misreservas.png` });

  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
