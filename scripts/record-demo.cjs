/* global Api */
/**
 * Grava o vídeo de backup da demo (celular 430x932, com legendas), seguindo
 * docs/demo-script.md no modo de demonstração offline.
 *
 * Requer o Playwright com o Chromium instalados (npx playwright install chromium)
 * e o site rodando (npm run dev, ou a URL publicada):
 *
 *   node scripts/record-demo.cjs <pasta-de-saída> <foto-de-notebook> [url-base]
 *
 * Gera um .webm na pasta. Para MP4:
 *   ffmpeg -i <arquivo>.webm -c:v libx264 -crf 23 -pix_fmt yuv420p -vf scale=860:-2 demo.mp4
 */
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2];
  const photo = process.argv[3];
  const b = await chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: 430, height: 932 },
    recordVideo: { dir: out, size: { width: 430, height: 932 } },
  });
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.accept());
  const base = (process.argv[4] || 'http://localhost:5173/').replace(/\/?$/, '/');
  const caption = async (text, ms = 2600) => {
    await p.evaluate((t) => {
      let el = document.getElementById('__cap');
      if (!el) {
        el = document.createElement('div');
        el.id = '__cap';
        Object.assign(el.style, {
          position: 'fixed',
          left: '12px',
          right: '12px',
          top: '78px',
          pointerEvents: 'none',
          zIndex: 99999,
          background: 'rgba(20,20,20,.88)',
          color: '#fff',
          font: '600 15px/1.35 Montserrat, sans-serif',
          padding: '12px 14px',
          borderRadius: '12px',
          textAlign: 'center',
        });
        document.body.appendChild(el);
      }
      el.textContent = t;
    }, text);
    await p.waitForTimeout(ms);
  };
  const type = async (sel, text) => {
    await p.click(sel);
    await p.type(sel, text, { delay: 22 });
  };
  const scroll = (sel) => p.locator(sel).first().scrollIntoViewIfNeeded();
  const login = async (id) => {
    await p.goto(base + 'login.html');
    await p.waitForTimeout(400);
    await p.click(`[data-user-id="${id}"]`);
    await p.waitForURL('**/dashboard.html');
    await p.waitForTimeout(500);
  };

  // limpa os dados de demo
  await p.goto(base + 'index.html');
  await p.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('lala_bridge_'))
      .forEach((k) => localStorage.removeItem(k));
  });
  await p.reload();
  await p.waitForTimeout(800);
  await caption(
    'LALA Bridge — conecta doadores de equipamentos a jovens Lalíderes. 65% dos brasileiros conectados usam só o celular.',
    4200
  );
  await caption(
    'Vídeo de backup gravado no modo de demonstração offline (sem servidor de IA).',
    3000
  );

  await login('lalider-demo-ana');
  await caption(
    'Ana, de Recife, precisa de um notebook. Ela descreve o pedido com as próprias palavras.',
    3200
  );
  await p.click('[data-action="new-request"] >> nth=0');
  await p.waitForTimeout(500);
  await type(
    '#assistant-text',
    'preciso de um notebook pra fazer curso de Python e mandar currículo, hoje só tenho o celular'
  );
  await caption('No celular, ela pode gravar um áudio. Aqui o texto foi digitado.', 2400);
  await p.click('#assistant-organize');
  await p.waitForTimeout(600);
  await caption(
    'O pedido é organizado: categoria, uso, 8 GB de RAM e urgência alta. Ela revisa antes de publicar.',
    3800
  );
  await scroll('#request-ram');
  await p.waitForTimeout(1500);
  await p.click('.modal__actions .btn--primary');
  await p.waitForTimeout(1200);
  await p.evaluate(() => Api.logout());

  await login('donor-001');
  await caption('Uma empresa doadora publica um notebook com foto.', 2400);
  await p.goto(base + 'donate.html');
  await p.waitForTimeout(500);
  await p.setInputFiles('#donation-photos', photo);
  await p.waitForTimeout(600);
  await p.click('#analyze-photos');
  await p.waitForTimeout(700);
  await caption(
    'Com IA configurada, a foto sugere modelo, estado e configurações. Offline, o doador preenche e confirma.',
    3800
  );
  await p.click('[data-category="laptop"]');
  await type('#donation-title', 'Notebook Lenovo IdeaPad 3 — 8GB RAM, SSD 256GB');
  await p.locator('#donation-title').blur();
  await type('#donation-desc', 'Revisado pela nossa equipe de TI. Bom para estudos e programação.');
  await p.selectOption('#donation-condition', 'good');
  await scroll('#donation-ram');
  await caption('RAM e SSD escritos no título já preenchem as configurações.', 2600);
  await p.selectOption('#donation-uf', 'PE');
  await p.fill('#donation-city', 'Recife');
  await scroll('#donation-form button[type=submit]');
  await p.click('#donation-form button[type=submit]');
  await p.waitForURL('**/dashboard.html');
  await p.waitForTimeout(800);
  await p.evaluate(() => Api.logout());

  await login('lalider-demo-ana');
  await scroll('.match-block');
  await p.waitForTimeout(500);
  await caption('O matching recomenda doações para a Ana e explica o motivo.', 2600);
  await p.locator('.match-block summary').first().click();
  await p.waitForTimeout(400);
  await caption('Atende 8 GB de RAM · Pedido urgente · Mesmo estado (PE).', 3400);
  await p
    .locator('.match-block')
    .first()
    .locator('xpath=ancestor::div[contains(@class,"card")]')
    .locator('[data-action="request-donation"]')
    .click();
  await p.waitForTimeout(500);
  await p.click('.modal__actions .btn--primary');
  await p.waitForTimeout(1000);
  await p.evaluate(() => Api.logout());

  await login('donor-001');
  await caption('O doador aceita. Só agora os contatos aparecem para os dois.', 2600);
  await scroll('[data-action="accept-offer"]');
  await p.click('[data-action="accept-offer"]');
  await p.waitForTimeout(800);
  await scroll('.offer-card:has-text("Ana") [data-action="deliver-offer"]');
  await p.waitForTimeout(1500);
  await p.click('.offer-card:has-text("Ana") [data-action="deliver-offer"]');
  await p.waitForTimeout(800);
  await caption('Entrega confirmada.', 1800);
  await p.evaluate(() => Api.logout());

  await login('lalider-demo-ana');
  await scroll('[data-action="share-impact"]');
  await p.click('[data-action="share-impact"]');
  await p.waitForTimeout(500);
  await type('#impact-text', 'Já terminei o primeiro módulo de Python e mandei 5 currículos!');
  await p.click('.modal__actions .btn--primary');
  await p.waitForTimeout(1000);
  await caption('A Ana conta como a doação ajudou. O doador recebe o relato e um resumo.', 3000);
  await p.evaluate(() => Api.logout());
  await login('donor-001');
  await scroll('.offer-card:has-text("Ana") .impact-update');
  await p.waitForTimeout(800);
  await caption('Relato e resumo para o doador.', 3000);

  await p.goto(base + 'impacto.html');
  await p.waitForTimeout(800);
  await caption(
    'A página de impacto mostra só números agregados: entregas, estados e lixo eletrônico evitado.',
    3800
  );
  await p.evaluate(() => Api.logout());
  await login('admin-demo');
  await scroll('#admin-flags');
  await caption(
    'Suspeitas viram sinalizações para revisão humana. Nada é bloqueado automaticamente.',
    3600
  );
  await p.goto(base + 'index.html');
  await p.waitForTimeout(600);
  await caption('LALA Bridge — open source (MIT). Qualquer ONG pode usar. Obrigado!', 4000);
  await ctx.close();
  await b.close();
})();
