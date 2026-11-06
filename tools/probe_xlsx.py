# -*- coding: utf-8 -*-
"""Structure discovery for all source workbooks (read-only)."""
import glob
import os
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter

BASE = r"C:\Users\17136\xwechat_files\wxid_98nz21egsn2512_23ff\msg"
FILES = [
    os.path.join(BASE, "file", "2026-11", "大型海藻重金属耐受EC50与胁迫前后数据.xlsx"),
]
F = os.path.join(BASE, "attach", "182f7380f2fc054619aa32e21b0fa0e0", "2026-11", "Rec", "24d5977deb184189", "F")
for pat in ("0/*.xlsx", "1/*.xlsx", "5/*.xlsx", "7/*.xlsx", "9/*.xlsx"):
    FILES.extend(glob.glob(os.path.join(F, pat)))

for path in FILES:
    print("=" * 100)
    print("FILE:", os.path.basename(path), "| exists:", os.path.exists(path))
    if not os.path.exists(path):
        continue
    wb = load_workbook(path, read_only=True, data_only=True)
    for ws in wb.worksheets:
        print("-" * 90)
        print(f"SHEET: {ws.title!r}  dims={ws.max_row} rows x {ws.max_column} cols")
        rows = list(ws.iter_rows(min_row=1, max_row=min(ws.max_row, 7), values_only=True))
        for i, row in enumerate(rows, 1):
            cells = []
            for j, v in enumerate(row[:60], 1):
                if v is not None and str(v).strip() != "":
                    s = str(v).replace("\n", "/")
                    if len(s) > 60:
                        s = s[:60] + "…"
                    cells.append(f"{get_column_letter(j)}={s}")
            print(f"  R{i}: " + " | ".join(cells))
    wb.close()
