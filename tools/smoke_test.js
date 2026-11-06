/* Headless smoke test: run app.js against a minimal DOM stub. */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const defaults = {
  npStrict: '55', npSort: '__score', npDir: 'desc', npSize: '20',
  metalIon: 'Cd', metalText: '', metalGroup: 'all',
  scPollution: 'medium', scIon: 'Cd', scWater: 'sea', scSal: '30',
  scGoal: 'resource', scCase: 'auto'
};
class El {
  constructor(id) {
    this.id = id; this.dataset = {}; this.value = defaults[id] || '';
    this.innerHTML = ''; this.textContent = ''; this.style = {};
    this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
  }
  addEventListener() {}
}
const els = {};
global.window = { scrollTo() {}, addEventListener() {} };
global.location = { hash: '' };
global.document = {
  documentElement: { dataset: { theme: 'dark' } },
  body: { innerHTML: '' },
  querySelector(sel) {
    if (sel.charAt(0) !== '#') return null;
    const id = sel.slice(1);
    return els[id] || (els[id] = new El(id));
  },
  querySelectorAll() { return []; },
  createElement() { return { click() {}, style: {} }; }
};
global.localStorage = { getItem() { return null; }, setItem() {} };
// Node's native URL class is used internally by the fs shim — only add static helpers.
if (typeof global.URL.createObjectURL !== 'function') {
  global.URL.createObjectURL = function () { return ''; };
  global.URL.revokeObjectURL = function () {};
}

eval(fs.readFileSync(path.join(ROOT, 'data/db.js'), 'utf8'));
eval(fs.readFileSync(path.join(ROOT, 'assets/js/app.js'), 'utf8'));

const checks = [
  ['总览 KPI', els.kpiGrid && /红藻 1034/.test(els.kpiGrid.innerHTML)],
  ['来源清单', els.sourcesList && els.sourcesList.innerHTML.indexOf('src-row') >= 0],
  ['Q1 红藻工作表', els.npResult && els.npResult.innerHTML.indexOf('红藻工作表') >= 0],
  ['Q1 绿藻工作表', els.npResult && els.npResult.innerHTML.indexOf('绿藻工作表') >= 0],
  ['Q1 X~AS 指标', els.npResult && els.npResult.innerHTML.indexOf('data-sort="nh4Eff"') >= 0],
  ['Q1 分组表头', els.npResult && els.npResult.innerHTML.indexOf('colspan="8"') >= 0],
  ['Q1 分页', els.npResult && els.npResult.innerHTML.indexOf('data-page="next"') >= 0],
  ['Q2 文献区', els.metalResult && els.metalResult.innerHTML.indexOf('与该离子相关的文献') >= 0],
  ['Q2 耐受排序', els.metalResult && els.metalResult.innerHTML.indexOf('藻体耐受性由高到低') >= 0],
  ['Q2 胁迫表', els.metalResult && els.metalResult.innerHTML.indexOf('胁迫条件下红藻') >= 0],
  ['Q2 PDF 链接', els.metalResult && els.metalResult.innerHTML.indexOf('assets/papers/') >= 0],
  ['Q2 变化率图', els.metalResult && els.metalResult.innerHTML.indexOf('mini-chart') >= 0],
  ['Q3 推荐卡片', els.sceneResult && els.sceneResult.innerHTML.indexOf('推荐用于治理的藻类') >= 0],
  ['Q3 推荐理由', els.sceneResult && els.sceneResult.innerHTML.indexOf('rec-reasons') >= 0],
  ['Q3 结论条', els.sceneResult && els.sceneResult.innerHTML.indexOf('verdict') >= 0],
  ['Q3 对比维度', els.sceneResult && els.sceneResult.innerHTML.indexOf('判断依据') >= 0],
  ['Q3 场景参考', els.sceneResult && els.sceneResult.innerHTML.indexOf('典型应用场景参考') >= 0],
  ['无致命错误', document.body.innerHTML === '']
];
let pass = 0;
checks.forEach(([name, ok]) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (ok) pass++; });
console.log('\n' + pass + '/' + checks.length + ' 通过');
console.log('结果区大小(KB):', ['npResult', 'metalResult', 'sceneResult']
  .map(k => k + '=' + ((els[k] ? els[k].innerHTML.length : 0) / 1024).toFixed(1)).join('  '));

const strip = h => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
console.log('\n--- Q3 推荐结果抽查 ---');
console.log(strip(els.sceneResult.innerHTML).slice(0, 1100));
console.log('\n--- Q2 耐受排序抽查 ---');
const rank = els.metalResult.innerHTML.match(/<div class="rank-list">([\s\S]*?)<\/div><\/div>/);
console.log(rank ? strip(rank[1]).slice(0, 420) : '(未匹配)');
console.log('\n--- Q1 表头字段抽查 ---');
const head = els.npResult.innerHTML.match(/<thead>([\s\S]*?)<\/thead>/);
console.log(head ? strip(head[1]).slice(0, 520) : '(未匹配)');
process.exit(pass === checks.length ? 0 : 1);
