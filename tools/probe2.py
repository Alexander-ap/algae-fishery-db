# -*- coding: utf-8 -*-
"""Inspect real row counts (Excel dimension is inflated) and full headers."""
import glob
import os
import re
import zipfile
from openpyxl.utils import get_column_letter

BASE = r"C:\Users\17136\xwechat_files\wxid_98nz21egsn2512_23ff\msg"
F = os.path.join(BASE, "attach", "182f7380f2fc054619aa32e21b0fa0e0", "2026-11", "Rec", "24d5977deb184189", "F")
FILES = [os.path.join(BASE, "file", "2026-11", "大型海藻重金属耐受EC50与胁迫前后数据.xlsx")]
for pat in ("0/*.xlsx", "1/*.xlsx", "5/*.xlsx", "7/*.xlsx", "9/*.xlsx"):
    FILES.extend(glob.glob(os.path.join(F, pat)))

for path in FILES:
    print("=" * 96)
    print(os.path.basename(path), f"{os.path.getsize(path)/1024:.1f} KB")
    with zipfile.ZipFile(path) as z:
        names = [n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n)]
        for n in sorted(names):
            xml = z.read(n).decode("utf-8", "ignore")
            rows = re.findall(r'<row[^>]*\br="(\d+)"', xml)
            print(f"  {n}: {len(rows)} real rows, max r={max(map(int, rows)) if rows else 0}")
