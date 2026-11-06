# -*- coding: utf-8 -*-
"""Final skeuomorphic polish + dark instrument-mode overrides."""
from pathlib import Path
p = Path(__file__).resolve().parents[1] / "assets" / "css" / "theme.css"
s = p.read_text(encoding="utf-8")
s = s.replace("border-right:3px solid #3a2f22;", "border-right:1px solid #3a2f22;")
s = s.replace(".page-btn{min-width:36px;height:36px;", ".page-btn{min-width:40px;height:40px;")
s = s.replace(".data-table thead th{position:sticky;top:0;z-index:3;background:var(--metal);",
              ".data-table thead th{position:sticky;top:0;z-index:3;background:var(--brushed);")
s += """
/* 夜间仪表模式补充覆盖 */
html[data-theme="dark"] .sheet-tab{background:linear-gradient(180deg,#5b4b38,#423526);color:var(--txt2)}
html[data-theme="dark"] .sheet-tab:hover{background:linear-gradient(180deg,#6b5941,#4e3f2e)}
html[data-theme="dark"] .rank-bar{background:linear-gradient(180deg,#2b2319,#3a3024)}
html[data-theme="dark"] .table-tools select{background:linear-gradient(180deg,#3a3024,#4a3d2e)}
html[data-theme="dark"] .btn.ghost{background:linear-gradient(180deg,rgba(106,89,65,.7),rgba(74,61,46,.7))}
html[data-theme="dark"] .instrument .lit-meta{color:var(--txt2)}
@media(max-width:900px){.page-btn{min-height:44px;height:44px}}
"""
p.write_text(s, encoding="utf-8")
print("tweaks applied")
