const fs = require('fs');
const path = require('path');

const logoDir = path.join(__dirname, 'logo');
const imageExt = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']);

const files = fs.readdirSync(logoDir);
const list = files
  .filter((name) => {
    const ext = path.extname(name).toLowerCase();
    return imageExt.has(ext);
  })
  .map((name) => {
    const base = path.basename(name, path.extname(name));
    return { name: base, url: `./logo/${name}` };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

const outPath = path.join(__dirname, 'logo.json');
fs.writeFileSync(outPath, JSON.stringify(list, null, 2), 'utf8');
console.log('已生成 logo.json，共', list.length, '个图片');
