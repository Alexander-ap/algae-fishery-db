/* 藻类智渔 AlgaeDB — 原生 JS，无运行时依赖（沿用博客 theme.js 的实现方式） */
(function () {
  'use strict';
  var DB = window.ALGAE_DB;
  if (!DB) { document.body.innerHTML = '<p style="padding:40px">数据文件 data/db.js 未加载</p>'; return; }

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var isNum = function (v) { return v !== null && v !== undefined && v !== '' && !isNaN(Number(v)); };
  var fmt = function (v, d) {
    d = d == null ? 2 : d;
    if (!isNum(v)) return '<span class="na">—</span>';
    return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: d });
  };
  var txt = function (v, d) { return isNum(v) ? Number(v).toFixed(d == null ? 2 : d) : '—'; };
  var toast = function (msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer); t._timer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  };
  var ION_CN = { Cd: 'Cd²⁺ 镉', Pb: 'Pb²⁺ 铅', Cu: 'Cu²⁺ 铜', Zn: 'Zn²⁺ 锌', Hg: 'Hg²⁺ 汞',
    Cr: 'Cr(Ⅵ) 铬', Ag: 'Ag⁺ 银', Al: 'Al³⁺ 铝', As: 'As 砷', Ni: 'Ni²⁺ 镍' };
  var ionName = function (k) { return ION_CN[k] || k; };
  var METRICS = DB.meta.metrics;
  var VIEW_TITLE = { overview: '总览驾驶舱', np: '氮磷吸附查询', metal: '重金属离子胁迫', scene: '治理方案推荐', sources: '数据与文献源' };

  function ionKey(s) {
    s = String(s || '');
    var pairs = [['Cd', /Cd|镉/i], ['Pb', /Pb|铅/], ['Cu', /Cu|铜/], ['Zn', /Zn|锌/], ['Hg', /Hg|汞/],
      ['Cr', /Cr|铬/], ['Ag', /Ag|银/], ['Al', /Al|铝/], ['As', /As|砷/], ['Ni', /Ni|镍/]];
    for (var i = 0; i < pairs.length; i++) if (pairs[i][1].test(s)) return pairs[i][0];
    return null;
  }

  /* ------------------------------------------------------------ shell */
  function show(view) {
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + view); });
    $$('.nav-item').forEach(function (b) { b.classList.toggle('active', b.dataset.view === view); });
    $('#crumbTitle').textContent = VIEW_TITLE[view] || view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $$('.nav-item').forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.view); }); });
  $$('[data-goto]').forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.goto); }); });
  $('#themeBtn').addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('algaedb-theme', next); } catch (e) { }
    toast(next === 'dark' ? '已切换夜间仪表模式' : '已切换日间纸面模式');
  });
  try {
    var saved = localStorage.getItem('algaedb-theme');
    if (saved) document.documentElement.dataset.theme = saved;
  } catch (e) { }

  function initOverview() {
    var c = DB.meta.counts;
    $('#sideNp').textContent = (c.npRed + c.npGreen).toLocaleString();
    $('#sidePapers').textContent = c.papers;
    $('#sideStress').textContent = c.stress;
    $('#sideDate').textContent = DB.meta.generated;
    $('#kpiGrid').innerHTML = [
      ['◈', (c.npRed + c.npGreen).toLocaleString(), '氮磷吸附实测记录', '红藻 ' + c.npRed + ' 条 · 绿藻表 ' + c.npGreen + ' 条'],
      ['▤', METRICS.length, 'X~AS 全量指标字段', '浓度 6 · 速率 6 · 效率 6 · 组织与总量 4'],
      ['◉', c.tolerance + c.stress, '耐受排序与胁迫记录', c.tolerance + ' 条 EC50 排序 · ' + c.stress + ' 条胁迫前后'],
      ['▣', c.papers, '自托管原始文献', c.ionLit + ' 条离子文献索引 · ' + c.micro + ' 条微藻关键数据']
    ].map(function (x) {
      return '<div class="kpi-card"><div class="kpi-ico">' + x[0] + '</div><div class="kpi-val">' + x[1] +
        '</div><div class="kpi-label">' + x[2] + '</div><div class="kpi-sub">' + x[3] + '</div></div>';
    }).join('');
    $('#overviewRules').innerHTML = DB.notes.rules.slice(0, 6).map(function (r) {
      return '<div>' + esc(r) + '</div>';
    }).join('');
    $('#sourcesList').innerHTML = DB.meta.sources.map(function (s) {
      return '<div class="src-row"><code>' + esc(s.group) + '</code><span title="' + esc(s.name) + '">' + esc(s.name) +
        '</span><small>' + (s.bytes / 1024).toFixed(0) + ' KB</small></div>';
    }).join('');
    $('#srcCount').textContent = DB.meta.sources.length + ' 个文件';
    $('#notesRules').innerHTML = DB.notes.rules.map(function (r) { return '<div>' + esc(r) + '</div>'; }).join('');
    $('#notesRefs').innerHTML = DB.notes.refs.map(function (r) {
      return '<div class="src-row"><code>' + esc(r.id) + '</code><span title="' + esc(r.text) + '">' + esc(r.text) + '</span></div>';
    }).join('');
  }

  /* ------------------------------------------------------------ shared UI helpers */
  function summary(cells) {
    return '<div class="summary">' + cells.map(function (c) {
      return '<div class="sum-cell"><b>' + c[0] + '</b><span>' + c[1] + '</span></div>';
    }).join('') + '</div>';
  }
  function blockHead(title, sub) {
    return '<div class="block-head"><h3>' + esc(title) + '</h3><span>' + esc(sub || '') + '</span></div>';
  }
  function empty(title, msg) {
    return '<div class="empty"><strong>' + esc(title) + '</strong>' + esc(msg) + '</div>';
  }
  function csvCell(v) {
    var s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function downloadCSV(name, rows) {
    var content = '\ufeff' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('已导出 ' + rows.length + ' 行数据');
  }

  /* ============================================================ QUERY 1 : N/P */
  function parseCoord(s) {
    if (!s || !String(s).trim()) return null;
    s = String(s).trim().replace(/[′’']/g, "'").replace(/[″"]/g, '"');
    var nums = s.match(/\d+(?:\.\d+)?/g);
    if (!nums) return null;
    var v = parseFloat(nums[0]) + (nums[1] ? parseFloat(nums[1]) / 60 : 0) + (nums[2] ? parseFloat(nums[2]) / 3600 : 0);
    if (/[SW]/i.test(s)) v = -v;
    return isFinite(v) ? v : null;
  }
  function areaOf(lon, lat) {
    if (lon == null || lat == null) return null;
    if (lat >= 37 && lon >= 117 && lon <= 122.5) return '渤海';
    if (lat >= 32 && lat < 37.5 && lon >= 119) return '黄海';
    if (lat >= 22 && lat < 32 && lon >= 116) return '东海';
    if (lat < 23 && lon >= 106) return '南海';
    return null;
  }
  function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  function adapt(rec, q) {
    var ds = 0.5, km = null;
    if (q.lon != null && q.lat != null && rec.lon != null && rec.lat != null) {
      km = haversine(q.lat, q.lon, rec.lat, rec.lon);
      ds = Math.exp(-km / 620);
    } else if (q.area && rec.areaCn === q.area) ds = 0.78;
    var ts = (q.temp == null || rec.temp == null) ? 0.6 : Math.exp(-Math.abs(q.temp - rec.temp) / 7);
    var ps = (q.ph == null || rec.ph == null) ? 0.6 : Math.exp(-Math.abs(q.ph - rec.ph) / 0.75);
    var ss = (q.sal == null || rec.sal == null) ? 0.6 : Math.exp(-Math.abs(q.sal - rec.sal) / 8);
    rec._km = km;
    rec._score = Math.min(99, Math.round(100 * (0.40 * ds + 0.22 * ts + 0.14 * ps + 0.24 * ss)));
    return rec._score;
  }
  var npState = { red: [], green: [], tab: 'red', sort: '__score', dir: 'desc', page: 1, size: 20, phylum: 'all', q: null };

  function initNpSelects() {
    var opts = '<option value="__score">综合适配度（默认）</option>';
    var groups = {};
    METRICS.forEach(function (m) { (groups[m.group] = groups[m.group] || []).push(m); });
    Object.keys(groups).forEach(function (g) {
      opts += '<optgroup label="' + esc(g) + '（X~AS）">';
      groups[g].forEach(function (m) {
        opts += '<option value="' + m.key + '">' + esc(m.cn) + ' · ' + esc(m.col) + ' 列</option>';
      });
      opts += '</optgroup>';
    });
    $('#npSort').innerHTML = opts;
  }

  function npRows() {
    var arr = npState[npState.tab].slice();
    if (npState.phylum !== 'all') arr = arr.filter(function (r) { return r.phylum === npState.phylum; });
    return arr;
  }
  function sortRows(arr) {
    var key = npState.sort, sign = npState.dir === 'desc' ? -1 : 1;
    return arr.sort(function (a, b) {
      var x, y;
      if (key === '__score') { x = a._score; y = b._score; }
      else { x = a.m[key]; y = b.m[key]; }
      if (x == null && y == null) return (b._score || 0) - (a._score || 0);
      if (x == null) return 1;
      if (y == null) return -1;
      if (Number(x) === Number(y)) return (b._score || 0) - (a._score || 0);
      return (Number(x) - Number(y)) * sign;
    });
  }
  function phylumOptions(arr) {
    var set = {}; arr.forEach(function (r) { set[r.phylum || '未标注'] = (set[r.phylum || '未标注'] || 0) + 1; });
    var keys = Object.keys(set).sort();
    var html = '<option value="all">全部门类 (' + arr.length + ')</option>';
    keys.forEach(function (k) { html += '<option value="' + esc(k) + '">' + esc(k) + ' (' + set[k] + ')</option>'; });
    return html;
  }
  function sheetTab(name, key, count, src) {
    return '<button class="sheet-tab ' + (npState.tab === key ? 'active' : '') + '" data-tab="' + key + '">' +
      '<span class="badge ' + (key === 'red' ? 'red' : 'green') + '">▤</span>' + esc(name) +
      '<em>' + count + '</em></button>';
  }
  function metricHead() {
    var groups = [], cur = null;
    METRICS.forEach(function (m) {
      if (!cur || cur.name !== m.group) { cur = { name: m.group, items: [] }; groups.push(cur); }
      cur.items.push(m);
    });
    var g1 = '<tr class="group-row"><th colspan="8" class="sticky">记录识别 · 环境条件 · 来源</th>';
    groups.forEach(function (g) { g1 += '<th colspan="' + g.items.length + '">' + esc(g.name) + ' · X~AS</th>'; });
    g1 += '</tr>';
    var g2 = '<tr class="col-row"><th class="sticky">藻种 / 记录</th>' +
      '<th data-sort="__score">适配度</th><th>门</th><th>海区</th><th>经纬度</th><th>pH / ℃ / PSU</th><th>年份</th><th>来源工作表</th>';
    METRICS.forEach(function (m) {
      g2 += '<th data-sort="' + m.key + '" title="' + esc(m.en + ' · ' + m.unit + ' · ' + m.col + ' 列') + '">' +
        esc(m.cn) + '<br><small style="opacity:.6">' + esc(m.col) + '</small></th>';
    });
    g2 += '</tr>';
    return '<thead>' + g1 + g2 + '</thead>';
  }
  function metricCell(v, max) {
    if (!isNum(v)) return '<td class="num"><span class="na">—</span></td>';
    var w = max > 0 ? Math.min(100, Math.abs(Number(v)) / max * 100) : 0;
    return '<td class="num ' + (Number(v) < 0 ? 'neg' : '') + '"><span class="cell">' +
      fmt(v, 2) + '<i class="bar" style="width:' + w.toFixed(1) + '%"></i></span></td>';
  }
  function renderNpTable(rows, page) {
    var maxes = {};
    METRICS.forEach(function (m) {
      var mx = 0;
      rows.forEach(function (r) { var v = Number(r.m[m.key]); if (isFinite(v)) mx = Math.max(mx, Math.abs(v)); });
      maxes[m.key] = mx;
    });
    var total = rows.length, pages = Math.max(1, Math.ceil(total / npState.size));
    page = Math.min(Math.max(1, page), pages); npState.page = page;
    var slice = rows.slice((page - 1) * npState.size, page * npState.size);
    var body = slice.map(function (r) {
      var s = '<tr><td class="sticky"><b>' + esc(r.speciesCn || r.species || '—') + '</b>' +
        '<div class="species">' + esc(r.species || '') + '</div><span class="cn">' + esc(r.id) + ' · 第 ' + r.row + ' 行</span></td>';
      s += '<td class="num"><b style="color:var(--accent)">' + r._score + '</b>' +
        (r._km != null ? '<div class="cn">距 ' + Math.round(r._km) + ' km</div>' : '') + '</td>';
      s += '<td><span class="badge ' + (r.phylum === 'Rhodophyta' ? 'red' : r.phylum === 'Chlorophyta' ? 'green' : 'gold') + '">' +
        esc(r.phylumCn) + '</span></td>';
      s += '<td>' + esc(r.areaCn) + '</td>';
      s += '<td class="num">' + esc(r.lonText || txt(r.lon, 2)) + ' / ' + esc(r.latText || txt(r.lat, 2)) + '</td>';
      s += '<td class="num">' + txt(r.ph, 2) + ' / ' + txt(r.temp, 1) + ' / ' + txt(r.sal, 1) + '</td>';
      s += '<td class="num">' + esc(r.year || '—') + '</td>';
      s += '<td>' + (r.group === 'red' ? '红藻 NP 表' : '绿藻 NP 表') + '</td>';
      METRICS.forEach(function (m) { s += metricCell(r.m[m.key], maxes[m.key]); });
      return s + '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data-table">' + metricHead() + '<tbody>' + body + '</tbody></table></div>' +
      '<div class="pager"><span>共 ' + total + ' 条 · 第 ' + page + '/' + pages + ' 页</span>' +
      '<button class="page-btn" data-page="prev"' + (page <= 1 ? ' disabled' : '') + '>上一页</button>' +
      '<button class="page-btn active">' + page + '</button>' +
      '<button class="page-btn" data-page="next"' + (page >= pages ? ' disabled' : '') + '>下一页</button>' +
      '<button class="page-btn" data-page="csv">导出本表 CSV</button></div>';
  }
  function renderNp() {
    var all = npRows(), sorted = sortRows(all.slice()), q = npState.q;
    var avg = all.length ? Math.round(all.reduce(function (s, r) { return s + r._score; }, 0) / all.length) : 0;
    var near = all.filter(function (r) { return r._km != null; }).map(function (r) { return r._km; });
    var species = {}; all.forEach(function (r) { species[r.species] = 1; });
    var html = summary([
      [(npState.red.length + npState.green.length).toLocaleString(), '符合匹配强度的记录'],
      [avg + ' 分', '平均综合适配度'],
      [near.length ? Math.round(Math.min.apply(null, near)) + ' km' : '—', '最近实验点位距离'],
      [Object.keys(species).length, '覆盖藻种数']
    ]);
    html += '<div class="note-bar"><span>◈</span><div>输入条件：<b>' +
      (q.lon != null ? q.lon.toFixed(2) + '°E' : '未填经度') + ' / ' + (q.lat != null ? q.lat.toFixed(2) + '°N' : '未填纬度') +
      '</b> · ' + txt(q.temp, 1) + ' ℃ · pH ' + txt(q.ph, 2) + ' · ' + txt(q.sal, 1) + ' PSU' +
      (q.area ? ' · 归属海区 ' + esc(q.area) : '') +
      '。适配度 = 地理距离 40% + 水温 22% + 盐度 24% + pH 14%；当前阈值 <b>≥ ' + q.strict + ' 分</b>。' +
      '每条记录完整呈现红藻表 X~AS 共 22 个字段；绿藻原表仅提供 TN 浓度、NH₄⁺/NO₃⁻/NO₂⁻/TP/PO₄³⁻ 浓度与 TN 去除速率 / 效率，未提供字段显示为「—」。</div></div>';
    if (!npState.red.length && !npState.green.length) {
      html += empty('没有符合条件的记录', '可放宽匹配强度、调整环境参数，或点击「重置」后重试。');
      $('#npResult').innerHTML = html; return;
    }
    html += '<div class="sheet-tabs">' +
      sheetTab('红藻工作表 · Rhodophyta', 'red', npState.red.length) +
      sheetTab('绿藻工作表 · Total Nitrogen', 'green', npState.green.length) + '</div>';
    html += '<div class="table-tools">' +
      '<label>门类 <select id="npPhylum">' + phylumOptions(npState[npState.tab]) + '</select></label>' +
      '<label>每页 <select id="npSize"><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>' +
      '<span class="grow"></span><span class="hint">点击表头可切换排序 · 当前按「' +
      esc(npState.sort === '__score' ? '综合适配度' : (METRICS.filter(function (m) { return m.key === npState.sort; })[0] || {}).cn) +
      '」' + (npState.dir === 'desc' ? '从高到低' : '从低到高') + '</span></div>';
    html += sorted.length ? renderNpTable(sorted, npState.page) : empty('该门类下暂无匹配记录', '请在工具栏切换门类筛选。');
    $('#npResult').innerHTML = html;
    $('#npPhylum').value = npState.phylum; $('#npSize').value = String(npState.size);
    $$('.sheet-tab').forEach(function (b) { b.addEventListener('click', function () {
      npState.tab = b.dataset.tab; npState.page = 1;
      npState.phylum = b.dataset.tab === 'green' ? 'Chlorophyta' : 'all';
      renderNp(); }); });
    $('#npPhylum').addEventListener('change', function () { npState.phylum = this.value; npState.page = 1; renderNp(); });
    $('#npSize').addEventListener('change', function () { npState.size = Number(this.value); npState.page = 1; renderNp(); });
    $$('#npResult [data-sort]').forEach(function (th) {
      th.classList.toggle('sorted', th.dataset.sort === npState.sort);
      th.addEventListener('click', function () {
        var k = th.dataset.sort;
        if (npState.sort === k) npState.dir = npState.dir === 'desc' ? 'asc' : 'desc';
        else { npState.sort = k; npState.dir = 'desc'; }
        $('#npSort').value = k; $('#npDir').value = npState.dir;
        npState.page = 1; renderNp();
      });
    });
    $$('#npResult [data-page]').forEach(function (b) { b.addEventListener('click', function () {
      if (b.dataset.page === 'csv') {
        var head = ['藻种中文名', '拉丁名', '门', '海区', '经度', '纬度', 'pH', '温度', '盐度', '年份', '来源', '适配度']
          .concat(METRICS.map(function (m) { return m.cn + ' (' + m.col + ', ' + m.unit + ')'; }));
        var rows = [head].concat(sorted.map(function (r) {
          return [r.speciesCn, r.species, r.phylumCn, r.areaCn, r.lon, r.lat, r.ph, r.temp, r.sal, r.year,
            r.group === 'red' ? '红藻NP表' : '绿藻NP表', r._score]
            .concat(METRICS.map(function (m) { return r.m[m.key] == null ? '' : r.m[m.key]; }));
        }));
        downloadCSV('氮磷吸附_' + npState.tab + '_匹配结果.csv', rows);
      } else { npState.page += (b.dataset.page === 'next' ? 1 : -1); renderNp(); }
    }); });
  }
  function runNp(silent) {
    var q = {
      lon: parseCoord($('#npLon').value), lat: parseCoord($('#npLat').value),
      temp: $('#npTemp').value === '' ? null : Number($('#npTemp').value),
      ph: $('#npPh').value === '' ? null : Number($('#npPh').value),
      sal: $('#npSal').value === '' ? null : Number($('#npSal').value),
      strict: Number($('#npStrict').value)
    };
    q.area = areaOf(q.lon, q.lat);
    if (!silent && q.lon == null && q.lat == null && q.temp == null && q.ph == null && q.sal == null) {
      toast('请至少填写经纬度或一项环境参数'); return;
    }
    npState.q = q; npState.sort = $('#npSort').value; npState.dir = $('#npDir').value; npState.page = 1;
    var pool = { red: DB.np.red.slice(), green: DB.np.green.slice() };
    npState.red = pool.red.filter(function (r) { return adapt(r, q) >= q.strict; });
    npState.green = pool.green.filter(function (r) { return adapt(r, q) >= q.strict; });
    // 绿藻工作表默认只看真正的绿藻门，避免把该表内的红藻/褐藻记录混入
    npState.phylum = npState.tab === 'green' ? 'Chlorophyta' : 'all';
    renderNp();
  }
  $('#npRun').addEventListener('click', function () { runNp(); toast('筛选完成，结果已按所选字段排序'); });
  $('#npReset').addEventListener('click', function () {
    ['npLon', 'npLat', 'npTemp', 'npPh', 'npSal'].forEach(function (id) { $('#' + id).value = ''; });
    $('#npStrict').value = '55'; $('#npSort').value = '__score'; $('#npDir').value = 'desc';
    npState.phylum = 'all'; runNp(true); toast('已重置查询条件');
  });
  $('#npDemo').addEventListener('click', function () {
    $('#npLon').value = '119°20′E'; $('#npLat').value = '39°42′N';
    $('#npTemp').value = '20'; $('#npPh').value = '8.07'; $('#npSal').value = '29.4';
    $('#npSort').value = 'nh4Eff'; runNp(true); toast('已载入渤海示例，并按铵态氮去除效率降序');
  });
  $('#npSort').addEventListener('change', function () { npState.sort = this.value; npState.page = 1; if (npState.q) renderNp(); });
  $('#npDir').addEventListener('change', function () { npState.dir = this.value; npState.page = 1; if (npState.q) renderNp(); });

  /* ============================================================ QUERY 2 : metal */
  function initMetalSelects() {
    $('#metalIon').innerHTML = DB.meta.ions.map(function (i) {
      return '<option value="' + i + '">' + esc(ionName(i)) + '</option>';
    }).join('');
    $('#metalIonCount').textContent = DB.meta.ions.length + ' 种离子';
    $('#scIon').innerHTML = '<option value="">不限 / 未指定</option>' + DB.meta.ions.map(function (i) {
      return '<option value="' + i + '">' + esc(ionName(i)) + '</option>';
    }).join('');
    $('#scCase').innerHTML += DB.cases.map(function (c, i) {
      return '<option value="' + i + '">' + esc(c.scene) + '</option>';
    }).join('');
  }
  function paperCard(p) {
    return '<div class="lit-card"><div class="lit-top">' +
      '<span class="badge ' + (p.group === '红藻' ? 'red' : p.group === '绿藻' ? 'green' : 'gold') + '">' + esc(p.group) + '</span>' +
      p.ions.map(function (i) { return '<span class="badge">' + esc(i) + '</span>'; }).join('') +
      '<span class="lit-meta">' + esc(p.year) + '</span></div>' +
      '<div class="lit-title">' + esc(p.title) + '</div>' +
      '<div class="lit-meta">' + esc(p.authors) + ' · ' + esc(p.journal) + '</div>' +
      (p.abstract ? '<div class="lit-abstract">' + esc(p.abstract) + '</div>'
        : '<div class="lit-abstract lit-empty">该文献文本层不含可提取摘要（扫描版或版权页），请打开原文 PDF 查阅。</div>') +
      '<div class="lit-foot"><a class="lit-link" href="' + esc(p.file) + '" target="_blank" rel="noopener">查看原文 PDF ↗</a>' +
      '<span class="lit-meta">' + esc(p.id) + (p.copies.length ? ' · 另 ' + p.copies.length + ' 份副本' : '') + '</span></div></div>';
  }
  function litCard(item) {
    return '<div class="lit-card"><div class="lit-top"><span class="badge green">离子文献索引</span>' +
      '<span class="badge">' + esc(item.ionRaw) + '</span><span class="lit-meta">' + esc(item.year) + '</span></div>' +
      '<div class="lit-title">' + esc(item.title) + '</div>' +
      '<div class="lit-meta">' + esc(item.author) + ' · ' + esc(item.species) + '</div>' +
      '<div class="lit-foot"><span class="lit-meta">来源：绿藻对重金属离子吸附文献汇总表 · 第 ' + esc(item.no) + ' 条</span></div></div>';
  }
  function runMetal(silent) {
    var raw = $('#metalText').value.trim();
    var ion = raw ? (ionKey(raw) || $('#metalIon').value) : $('#metalIon').value;
    if (DB.meta.ions.indexOf(ion) === -1) ion = DB.meta.ions[0];
    var tol = DB.tolerance.filter(function (t) { return t.ion === ion; })
      .sort(function (a, b) { return Number(b.value) - Number(a.value); });
    var papers = DB.papers.filter(function (p) { return p.ions.indexOf(ion) >= 0; })
      .sort(function (a, b) { return Number(b.year || 0) - Number(a.year || 0); });
    var ionLit = DB.ionLit.filter(function (l) { return l.ion === ion; });
    var micro = DB.micro.filter(function (m) { return m.ion === ion; });
    var grp = $('#metalGroup').value;
    var stress = DB.stress.filter(function (s) {
      return s.ion === ion && (grp === 'all' || s.phylum === grp || (grp === '微藻' && s.algaeType === '微藻'));
    });
    var redN = tol.filter(function (t) { return t.phylum === '红藻门'; }).length;
    var greenN = tol.filter(function (t) { return t.phylum === '绿藻门'; }).length;
    var grpLabel = { all: '全部藻类', '红藻门': '仅红藻门', '绿藻门': '仅绿藻门', '微藻': '仅微藻' }[grp] || grp;
    var maxVal = tol.length ? Math.max.apply(null, tol.map(function (t) { return Number(t.value) || 0; })) : 1;

    var html = summary([
      [papers.length + ionLit.length + micro.length, '相关文献与文献索引'],
      [tol.length, '耐受性排序藻种'],
      [stress.length, '胁迫前后实测记录'],
      [redN + ' / ' + greenN, '红藻门 / 绿藻门藻种']
    ]);
    html += '<div class="note-bar"><span>◉</span><div>当前离子：<b>' + esc(ionName(ion)) +
      '</b>。耐受判定值越大表示耐受性越强；不同文献的 EC50 终点、暴露时长与浓度基准不同，跨行比较仅作趋势参考。' +
      '胁迫数据分组：<b>' + esc(grpLabel) + '</b>。</div></div>';

    html += blockHead('与该离子相关的文献', papers.length + ' 篇原文 PDF · ' + ionLit.length + ' 条索引 · ' + micro.length + ' 条微藻结论');
    var cards = papers.map(paperCard).concat(ionLit.map(litCard));
    micro.forEach(function (m) {
      cards.push('<div class="lit-card"><div class="lit-top"><span class="badge gold">微藻关键数据</span>' +
        '<span class="badge">' + esc(m.ionRaw) + '</span><span class="lit-meta">' + esc(m.year) + '</span></div>' +
        '<div class="lit-title">' + esc(m.title) + '</div>' +
        '<div class="lit-meta">' + esc(m.authors) + ' · ' + esc(m.journal) + ' · ' + esc(m.group) + '（' + esc(m.live) + '）</div>' +
        '<div class="lit-abstract" style="max-height:none">' + esc(m.finding) + '</div>' +
        '<div class="lit-foot"><span class="lit-meta">藻种：' + esc(m.species) + '</span></div></div>');
    });
    html += cards.length ? '<div class="lit-grid">' + cards.join('') + '</div>' : empty('暂无相关文献', '可尝试其它离子或清除关键词。');

    html += blockHead('藻体耐受性由高到低', '数据源：EC50 耐受性排序表 · 判定值单位 mg/L');
    if (tol.length) {
      html += '<div class="rank-list">' + tol.map(function (t, i) {
        var w = Math.max(4, (Number(t.value) || 0) / maxVal * 100);
        var badge = t.phylum === '红藻门' ? 'red' : t.phylum === '绿藻门' ? 'green' : 'gold';
        return '<div class="rank-row ' + (i === 0 ? 'top' : '') + '">' +
          '<div class="rank-no">' + (i + 1) + '</div>' +
          '<div class="rank-name"><b>' + esc(t.species) + '</b><small>' + esc(t.speciesCn) +
          ' · <span class="badge ' + badge + '">' + esc(t.phylum) + '</span> ' + esc(t.algaeType) + '</small></div>' +
          '<div class="rank-bar"><i style="width:' + w.toFixed(1) + '%"></i></div>' +
          '<div class="rank-val">' + esc(t.value) + '</div>' +
          '<div class="rank-meta"><span>判定：' + esc(t.judge) + '</span><span>终点：' + esc(t.endpoint) +
          '</span><span>暴露：' + esc(t.duration) + '</span><span>来源：' + esc(t.sourceId) + '</span></div></div>';
      }).join('') + '</div>';
    } else html += empty('该离子暂无耐受性排序数据', '可查看下方文献与胁迫记录。');

    html += blockHead('胁迫条件下红藻 / 绿藻的吸附与生理响应', stress.length + ' 条实测记录 · 变化率 =（终值−前值）/前值');
    if (stress.length) {
      var changes = stress.map(function (s) { return Number(s.change) || 0; });
      var maxAbs = Math.max.apply(null, changes.map(Math.abs).concat([0.01]));
      html += '<div class="instrument"><div class="lit-meta" style="font-weight:700;margin-bottom:8px">各记录变化率分布 · 负值 = 受抑制（橙红）</div>' +
        '<div class="mini-chart">' + changes.slice(0, 90).map(function (c) {
          return '<i class="' + (c < 0 ? 'negative' : '') + '" style="height:' +
            Math.max(4, Math.abs(c) / maxAbs * 60).toFixed(1) + 'px" title="' + c.toFixed(3) + '"></i>';
        }).join('') + '</div></div>';
      html += '<div class="table-wrap" style="border-radius:14px"><table class="data-table"><thead><tr>' +
        '<th class="sticky">藻种 / 门类</th><th>金属 / 形态</th><th>浓度 mg/L</th><th>原始表述</th><th>指标</th>' +
        '<th>胁迫前</th><th>胁迫后</th><th>变化率</th><th>数值性质</th><th>暴露时长</th><th>来源</th></tr></thead><tbody>' +
        stress.map(function (s) {
          return '<tr><td class="sticky"><b>' + esc(s.speciesCn || s.species) + '</b><div class="species">' + esc(s.species) +
            '</div><span class="cn">' + esc(s.phylum) + ' · ' + esc(s.algaeType) + '</span></td>' +
            '<td>' + esc(s.ionRaw) + ' / ' + esc(s.salt) + '</td><td class="num">' + esc(s.conc) + '</td><td>' + esc(s.concRaw) + '</td>' +
            '<td>' + esc(s.indicator) + '<span class="cn">' + esc(s.unit) + '</span></td>' +
            '<td class="num">' + txt(s.before, 3) + '</td><td class="num">' + txt(s.after, 3) + '</td>' +
            '<td class="num ' + (Number(s.change) < 0 ? 'neg' : 'pos') + '">' +
            (isNum(s.change) ? (Number(s.change) * 100).toFixed(2) + '%' : '—') + '</td>' +
            '<td>' + esc(s.nature) + '</td><td>' + esc(s.duration) + '</td><td>' + esc(s.sourceId) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else html += empty('该分组下暂无胁迫实测记录', '可在上方切换胁迫数据分组。');

    html += '<div class="note-bar" style="margin-top:16px"><span>ℹ</span><div>' +
      esc(DB.notes.rules[7] || '不同文献的暴露时长与终点不同，跨行比较请结合来源说明。') + '</div></div>';
    $('#metalResult').innerHTML = html;
    if (!silent) toast('已聚合 ' + ionName(ion) + ' 的文献与耐受数据');
  }
  $('#metalRun').addEventListener('click', function () { runMetal(); });
  $('#metalIon').addEventListener('change', function () { $('#metalText').value = ''; runMetal(true); });
  $('#metalGroup').addEventListener('change', function () { runMetal(true); });
  $('#metalText').addEventListener('keydown', function (e) { if (e.key === 'Enter') runMetal(); });

  /* ============================================================ QUERY 3 : scenario */
  var MICRO_SPECIES = [
    { species: 'Dunaliella salina', cn: '杜氏盐藻' },
    { species: 'Chlorella vulgaris', cn: '普通小球藻' },
    { species: 'Chlorella pyrenoidosa', cn: '蛋白核小球藻' },
    { species: 'Scenedesmus obliquus', cn: '斜生栅藻' },
    { species: 'Chlamydomonas microsphaera', cn: '小球衣藻' },
    { species: 'Desmodesmus communis', cn: '栅藻属 Desmodesmus' },
    { species: 'Monoraphidium pusillum', cn: '微小单针藻' },
    { species: 'Microcystis aeruginosa', cn: '铜绿微囊藻' },
    { species: 'Spirulina platensis', cn: '钝顶螺旋藻' },
    { species: 'Scenedesmus quadricauda', cn: '四尾栅藻' },
    { species: '淡水微藻 FZUL-321', cn: '淡水微藻 FZUL-321' }
  ];
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function evalCandidate(rec, cfg, type) {
    var score = 42, reasons = [], sal = cfg.sal;
    var waterName = cfg.water === 'sea' ? '海水 / 近海体系' : cfg.water === 'brackish' ? '河口半咸水体系' : '淡水体系';
    if (cfg.water === 'fresh') {
      if (type === 'micro') { score += 13; reasons.push('输入为<b>' + waterName + '</b>：微藻在淡水、海水均可培养，封闭体系更可控（对比维度「适用水体与盐度」）'); }
      else { score -= 8; reasons.push('输入为<b>' + waterName + '</b>：大型海藻以海水、半咸水为主，淡水体系适配性较弱'); }
    } else {
      if (type === 'macro') { score += 12; reasons.push('输入为<b>' + waterName + '</b>：大型海藻以海水、半咸水为主，与目标水体匹配（对比维度「适用水体与盐度」）'); }
      else { score += 3; reasons.push('输入为<b>' + waterName + '</b>：微藻淡水、海水均可，适用于封闭培养体系'); }
    }
    if (type === 'macro' && isNum(rec.sal) && sal != null) {
      var d = Math.abs(Number(rec.sal) - sal);
      if (d <= 3) { score += 8; reasons.push('该记录实验盐度 <b>' + rec.sal + ' PSU</b>，与输入 ' + sal + ' PSU 仅差 ' + d.toFixed(1) + '，环境条件高度吻合'); }
      else if (d <= 10) { score += 4; reasons.push('该记录实验盐度 <b>' + rec.sal + ' PSU</b>，与输入 ' + sal + ' PSU 相差 ' + d.toFixed(1) + '，处于可接受区间'); }
    }
    if (cfg.pollution === 'high') {
      if (type === 'micro') { score += 16; reasons.push('高浓度工业废水：微藻死藻干粉吸附快、可反复使用且不受金属毒性影响（对比维度「重金属」）'); }
      else { score -= 4; reasons.push('高浓度工业废水对活体大型藻毒性压力大，宜优先微藻吸附剂'); }
    } else if (cfg.pollution === 'trace') {
      if (type === 'macro') { score += 10; reasons.push('痕量 / 低浓度污染：活体大型藻富集能力强，适合长期暴露净化与生物指示 / 监测'); }
      else { score += 2; reasons.push('痕量污染：微藻可净化到很低残留，但需配套培养与收获设施'); }
    } else if (cfg.pollution === 'medium') {
      if (type === 'macro') { score += 6; reasons.push('中等浓度污染：大型藻活体富集可获得较高总金属移除量，收获后带出水体'); }
      else { score += 5; reasons.push('中等浓度污染：微藻胞外吸附 + 胞内吸收，可兼顾速率与残留浓度'); }
    } else {
      if (type === 'macro') reasons.push('无明显重金属污染：优先按 N、P 去除与水体条件选型');
    }
    if (cfg.ion) {
      var t = DB.tolerance.filter(function (x) { return x.ion === cfg.ion && x.species === rec.species; })[0];
      if (t) {
        score += Math.max(3, 11 - (Number(t.rank) - 1) * 2);
        reasons.push('对 <b>' + esc(ionName(cfg.ion)) + '</b> 的耐受判定值 <b>' + t.value + ' mg/L</b>（' +
          esc(t.judge) + '；终点 ' + esc(t.endpoint) + '；' + esc(t.duration) + '），在同离子耐受排序中第 ' + t.rank + ' 位');
      } else if (type === 'micro') {
        var mr = DB.micro.filter(function (m) { return m.ion === cfg.ion && String(m.species).indexOf(String(rec.species).split(' ')[0]) >= 0; })[0];
        if (mr) { score += 7; reasons.push('微藻文献《' + esc(mr.title) + '》直接覆盖 <b>' + esc(ionName(cfg.ion)) +
          '</b>，关键数据：' + esc(String(mr.finding).slice(0, 95)) + '…'); }
      }
    }
    var goalMap = {
      resource: ['macro', '「移除并资源化」：大型藻生物量大、可收获带走营养盐，适合 IMTA 养殖尾水与近海富营养化海域'],
      fast: ['micro', '「快速降低浓度」：微藻单位体积产率高、N/P 去除速率快'],
      deep: ['micro', '「深度处理至低浓度」：微藻适合污水二 / 三级深度处理'],
      both: ['both', '「N 与 P 兼顾」：两类藻均可，按水体与设施条件组合'],
      none: ['none', '未指定 N、P 去除诉求，按水体与重金属条件选型']
    };
    var goal = goalMap[cfg.goal];
    if (goal[0] === type) { score += 11; reasons.push(goal[1] + '（对比维度「N、P 去除」）'); }
    else if (goal[0] === 'both') { score += 6; reasons.push(goal[1]); }
    if (type === 'macro' && rec.m) {
      var bits = [];
      if (isNum(rec.m.nh4Eff)) bits.push('NH₄⁺-N 去除效率 <b>' + txt(rec.m.nh4Eff, 2) + '%</b>');
      if (isNum(rec.m.tnEff)) bits.push('TN 去除效率 <b>' + txt(rec.m.tnEff, 2) + '%</b>');
      if (isNum(rec.m.tpEff)) bits.push('TP 去除效率 <b>' + txt(rec.m.tpEff, 2) + '%</b>');
      if (isNum(rec.m.nh4Rate)) bits.push('NH₄⁺-N 去除速率 <b>' + txt(rec.m.nh4Rate, 3) + ' μg·g⁻¹FW·h⁻¹</b>');
      if (isNum(rec.m.tnRate)) bits.push('TN 去除速率 <b>' + txt(rec.m.tnRate, 3) + ' μg·g⁻¹FW·h⁻¹</b>');
      if (bits.length) {
        score += 5;
        var eff = isNum(rec.m.nh4Eff) ? Number(rec.m.nh4Eff) : (isNum(rec.m.tnEff) ? Number(rec.m.tnEff) : 0);
        score += Math.round(clamp(eff / 100 * 6, 0, 6));
        reasons.push('氮磷实测支撑：' + bits.slice(0, 4).join('、') + '（' +
          (rec.group === 'red' ? '红藻' : '绿藻') + ' NP 表第 ' + rec.row + ' 行，' + esc(rec.areaCn) + '）');
      }
    }
    if (type === 'micro') {
      var mm = DB.micro.filter(function (m) { return String(m.species).indexOf(String(rec.species).split(' ')[0]) >= 0; })[0];
      if (mm && reasons.join('').indexOf(String(mm.title)) === -1) {
        score += 4; reasons.push('微藻实测数据：《' + esc(mm.title) + '》（' + esc(mm.journal) + ' ' + esc(mm.year) + '）：' +
          esc(String(mm.finding).slice(0, 110)) + '…');
      }
    }
    return { score: clamp(Math.round(score), 12, 98), reasons: reasons };
  }
  function scoreRing(v) {
    var r = 24, c = 2 * Math.PI * r, off = c * (1 - v / 100);
    return '<div class="score-ring"><svg width="56" height="56" viewBox="0 0 56 56">' +
      '<circle cx="28" cy="28" r="' + r + '" fill="none" stroke="var(--line-2)" stroke-width="5"/>' +
      '<circle cx="28" cy="28" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" ' +
      'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><b>' + v + '</b></div>';
  }
  function runScene(silent) {
    var cfg = {
      pollution: $('#scPollution').value, ion: $('#scIon').value, water: $('#scWater').value,
      sal: $('#scSal').value === '' ? null : Number($('#scSal').value),
      goal: $('#scGoal').value, caseIdx: $('#scCase').value
    };
    if (cfg.sal == null) cfg.sal = cfg.water === 'sea' ? 30 : cfg.water === 'brackish' ? 12 : 2;
    var macro = {}, list = DB.np.red.concat(DB.np.green);
    list.forEach(function (r) {
      if (!r.species) return;
      var fit = isNum(r.sal) ? Math.abs(Number(r.sal) - cfg.sal) : 99;
      if (!macro[r.species] || fit < macro[r.species]._fit ||
        (fit === macro[r.species]._fit && (r.m.nh4Eff || 0) > (macro[r.species].m.nh4Eff || 0))) {
        r._fit = fit; macro[r.species] = r;
      }
    });
    var macroCands = Object.keys(macro).map(function (k) { return macro[k]; })
      .sort(function (a, b) { return a._fit - b._fit; }).slice(0, 14);
    var microCands = MICRO_SPECIES.map(function (m) {
      return { species: m.species, speciesCn: m.cn, phylumCn: '微藻', group: 'micro', m: null, sal: null, row: '—' };
    });
    var results = [];
    macroCands.forEach(function (r) { var e = evalCandidate(r, cfg, 'macro'); results.push({ rec: r, type: 'macro', e: e }); });
    microCands.forEach(function (r) { var e = evalCandidate(r, cfg, 'micro'); results.push({ rec: r, type: 'micro', e: e }); });
    results.sort(function (a, b) { return b.e.score - a.e.score; });
    var top = results.slice(0, 4);
    var leadType = top.length ? top[0].type : 'macro';
    var other = results.filter(function (x) { return x.type !== leadType; })[0];
    if (other && top.indexOf(other) < 0) top.push(other);
    for (var qi = 4; qi < results.length && top.length < 6; qi++) {
      if (top.indexOf(results[qi]) < 0) top.push(results[qi]);
    }
    top.forEach(function (x) { x.alt = x.type !== leadType; });
    var bestMacro = results.filter(function (x) { return x.type === 'macro'; })[0];
    var bestMicro = results.filter(function (x) { return x.type === 'micro'; })[0];
    var verdict, vdesc;
    if (bestMacro && bestMicro && Math.abs(bestMacro.e.score - bestMicro.e.score) <= 6) {
      verdict = '大型海藻 + 微藻耦合方案';
      vdesc = '两类藻得分接近（大型藻 ' + bestMacro.e.score + ' / 微藻 ' + bestMicro.e.score +
        '）：可用微藻快速削减峰值浓度，再由大型海藻持续吸收并通过收获移除营养盐（典型场景表第 9 条）。';
    } else if (bestMacro && (!bestMicro || bestMacro.e.score >= bestMicro.e.score)) {
      verdict = '优先采用大型海藻（IMTA 生物滤器 / 海域修复）';
      vdesc = '当前条件下大型海藻得分 ' + bestMacro.e.score + '，高于微藻 ' + (bestMicro ? bestMicro.e.score : '—') +
        '。海水 / 半咸水体系、大水量长期运行、藻体可收获资源化是主要依据。';
    } else {
      verdict = '优先采用微藻（深度处理 / 生物吸附）';
      vdesc = '当前条件下微藻得分 ' + (bestMicro ? bestMicro.e.score : '—') +
        '，高于大型海藻 ' + (bestMacro ? bestMacro.e.score : '—') + '。快速降浓度、可控培养与高浓度废水耐受是主要依据。';
    }

    var html = '<div class="verdict"><div class="v-ico">✦</div><div><h3>' + esc(verdict) + '</h3><p>' + esc(vdesc) +
      '</p></div></div>';
    html += summary([
      [results.length, '参与匹配的候选藻种'],
      [cfg.pollution === 'none' ? '无' : esc(ionName(cfg.ion || '多种')), '重金属污染条件'],
      [cfg.sal + ' PSU', '目标水体盐度'],
      [top[0] ? top[0].e.score : '—', '最高匹配得分']
    ]);
    html += blockHead('推荐用于治理的藻类', '按匹配得分排序，并附另一技术路线的备选 · 每条理由回指输入条件与对应数据');
    html += '<div class="rec-grid">' + top.map(function (x, i) {
      var r = x.rec;
      var title = r.speciesCn || r.species;
      var sub = r.speciesCn ? r.species : ((r.phylumCn || '藻类') + ' · 未收录中文定名');
      var chips = '<span class="chip hi">' + (x.type === 'macro' ? '大型海藻' : '微藻') + '</span>' +
        '<span class="chip">' + esc(x.type === 'macro' ? r.phylumCn : '微藻类群') + '</span>' +
        (x.type === 'macro' && isNum(r.sal) ? '<span class="chip">盐度 ' + esc(r.sal) + ' PSU</span>' : '') +
        (x.type === 'macro' ? '<span class="chip">' + esc(r.areaCn) + '</span>' : '');
      var metrics = '';
      if (x.type === 'macro' && r.m) {
        metrics = [['NH₄⁺-N 去除效率', r.m.nh4Eff, '%'], ['TN 去除效率', r.m.tnEff, '%'],
          ['NH₄⁺-N 去除速率', r.m.nh4Rate, 'μg/g·h'], ['PO₄³⁻-P 去除效率', r.m.po4Eff, '%']]
          .filter(function (q) { return isNum(q[1]); }).map(function (q) {
            return '<span class="metric-chip">' + q[0] + '<b>' + txt(q[1], 2) + ' ' + q[2] + '</b></span>';
          }).join('');
      }
      return '<div class="rec-card ' + (i === 0 ? 'best' : '') + '"><div class="rec-head">' + scoreRing(x.e.score) +
        '<div class="rec-title"><h4>' + esc(title) + (i === 0 ? ' <span class="badge gold">首选</span>' : '') +
        (x.alt ? ' <span class="badge">备选路线</span>' : '') +
        '</h4><div class="latin">' + esc(sub) + '</div><div class="chips">' + chips + '</div></div></div>' +
        '<ul class="rec-reasons">' + x.e.reasons.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
        (metrics ? '<div class="rec-metrics">' + metrics + '</div>' : '') + '</div>';
    }).join('') + '</div>';

    html += blockHead('判断依据 · 大型海藻 vs 微藻对比维度', '数据源：大型海藻与微藻应用场景对比表');
    html += '<div class="panel"><table class="cmp-table"><thead><tr><th>对比维度</th><th>大型海藻</th><th>微藻</th><th>怎么判断</th></tr></thead><tbody>' +
      DB.compare.map(function (c) {
        return '<tr><th>' + esc(c.dim) + '</th><td>' + esc(c.macro) + '</td><td>' + esc(c.micro) +
          '</td><td style="color:var(--accent)">' + esc(c.rule) + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    var caseHits = DB.cases.filter(function (c) {
      var s = c.scene + c.plan + c.reason;
      if (cfg.pollution === 'high') return /重金属|工业废水/.test(s);
      if (cfg.goal === 'deep' || cfg.pollution === 'none') return /深度|N、P|污水|富营养|尾水/.test(s);
      if (cfg.water === 'sea') return /海水|近海|尾水|海域/.test(s);
      return /微藻|可控/.test(s);
    }).slice(0, 5);
    if (cfg.caseIdx !== 'auto' && DB.cases[Number(cfg.caseIdx)]) {
      caseHits = [DB.cases[Number(cfg.caseIdx)]].concat(caseHits.filter(function (c) { return c !== DB.cases[Number(cfg.caseIdx)]; })).slice(0, 5);
    }
    html += blockHead('典型应用场景参考', '数据源：应用场景表 · 按本次输入条件匹配');
    html += '<div class="lit-grid">' + caseHits.map(function (c) {
      return '<div class="lit-card"><div class="lit-top"><span class="badge green">典型场景</span></div>' +
        '<div class="lit-title">' + esc(c.scene) + '</div>' +
        '<div class="lit-meta">推荐方案：<b style="color:var(--accent)">' + esc(c.plan) + '</b></div>' +
        '<div class="lit-abstract" style="max-height:none">' + esc(c.reason) + '</div></div>';
    }).join('') + '</div>';
    $('#sceneResult').innerHTML = html;
    if (!silent) toast('已生成 ' + results.length + ' 个候选的治理推荐');
  }
  $('#sceneRun').addEventListener('click', function () { runScene(); });
  $('#sceneDemo').addEventListener('click', function () {
    $('#scPollution').value = 'trace'; $('#scIon').value = 'Cd'; $('#scWater').value = 'sea';
    $('#scSal').value = '30'; $('#scGoal').value = 'resource'; $('#scCase').value = 'auto';
    runScene(true); toast('已载入养殖尾水 / 近海修复示例');
  });
  ['scPollution', 'scIon', 'scWater', 'scGoal', 'scCase'].forEach(function (id) {
    $('#' + id).addEventListener('change', function () { runScene(true); });
  });

  /* ------------------------------------------------------------ boot */
  initOverview();
  initNpSelects();
  initMetalSelects();
  $('#npLon').value = '119°20′E'; $('#npLat').value = '39°42′N';
  $('#npTemp').value = '20'; $('#npPh').value = '8.07'; $('#npSal').value = '29.4';
  $('#npSort').value = 'nh4Eff';
  $('#metalIon').value = 'Cd';
  $('#scSal').value = '30';
  $('#scIon').value = 'Cd';
  runNp(true);
  runMetal(true);
  runScene(true);
  // URL hash 直达：index.html#np / #metal / #scene / #sources
  var hashView = function () { var v = location.hash.replace('#', ''); if (VIEW_TITLE[v]) show(v); };
  window.addEventListener('hashchange', hashView);
  hashView();
})();
