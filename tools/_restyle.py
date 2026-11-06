# -*- coding: utf-8 -*-
"""One-off restyle replacements for the skeuomorphic instrument theme."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

html = ROOT / "index.html"
s = html.read_text(encoding="utf-8")
repl = [
    ('data-theme="dark"', 'data-theme="light"'),
    ('<span class="grad">可查询的渔业决策</span>', '<span class="brass">可查询的渔业决策</span>'),
    ('MARINE BIO-REMEDIATION INTELLIGENCE', '海洋生物修复 · 智能渔业数据中台'),
    ('QUERY 01 · NUTRIENT REMOVAL', '查询 01 · 氮磷吸附区域适配'),
    ('QUERY 02 · HEAVY METAL STRESS', '查询 02 · 重金属离子胁迫'),
    ('QUERY 03 · REMEDIATION ADVISOR', '查询 03 · 治理方案推荐'),
    ('>DATA LINEAGE<', '>数据来源与口径<'),
    ('<span class="dot"></span>LIVE DATA', '<span class="dot"></span>实时数据'),
    ('#39e6c8', '#c9a35c'),
    ('#0e6d78', '#6b5b45'),
    ('#43e3bf', '#3d857e'),
    ('#ffb27a', '#d9ae62'),
    ('#ff7f57', '#a8622a'),
    ('#57d9cf', '#8b7355'),
    ('#7ff2dd', '#c9a35c'),
    ('#ffad70', '#a8622a'),
]
for a, b in repl:
    if a not in s:
        print("MISS:", a[:60])
    s = s.replace(a, b)
html.write_text(s, encoding="utf-8")

js = ROOT / "assets" / "js" / "app.js"
t = js.read_text(encoding="utf-8")
old = ("'<div class=\"panel soft\"><div class=\"panel-head\"><h3>各记录变化率分布</h3>"
       "<span class=\"tag\">负值 = 受抑制</span></div>' +")
new = ("'<div class=\"instrument\"><div class=\"lit-meta\" style=\"font-weight:700;margin-bottom:8px\">"
       "各记录变化率分布 · 负值 = 受抑制（橙红）</div>' +")
if old not in t:
    print("MISS: instrument block")
t = t.replace(old, new)
t = t.replace("'已切换深海主题' : '已切换浅色主题'", "'已切换夜间仪表模式' : '已切换日间纸面模式'")
js.write_text(t, encoding="utf-8")
print("restyle done")
