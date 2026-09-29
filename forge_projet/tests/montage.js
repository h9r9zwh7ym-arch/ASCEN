// Planches contact : assemble les captures d'un dossier (8 par planche) pour une revue rapide.
// Usage : node tests/montage.js <dossier> [par_planche]
const __pw = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const dir = path.resolve(process.argv[2]), per = +(process.argv[3] || 8);
  const files = fs.readdirSync(dir).filter(f => /^\d.*\.png$/.test(f)).sort();
  const b = await __pw.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await b.newPage({ viewport: { width: 1600, height: 900 } });
  for (let i = 0; i < files.length; i += per) {
    const chunk = files.slice(i, i + per);
    await page.setContent(`<body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(4,390px);gap:10px;padding:10px;font:12px sans-serif">${chunk.map(f => `<div><div style="color:#fff">${f}</div><img src="data:image/png;base64,${fs.readFileSync(dir + "/" + f).toString("base64")}" style="width:390px;display:block"></div>`).join('')}</body>`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/sheet_${String(i / per + 1).padStart(2, '0')}.png`, fullPage: true });
  }
  await b.close(); console.log(Math.ceil(files.length / per), 'planches');
})();
