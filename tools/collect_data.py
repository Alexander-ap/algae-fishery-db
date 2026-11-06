# -*- coding: utf-8 -*-
"""
Collect every referenced source file into C:/Users/17136/Desktop/数据.

COPY ONLY: the WeChat source files are never moved, renamed or modified.
Original sub-folder numbering (0, 1, 3_1, 5, 6_0, 7, 8_0, 9 ...) is preserved.
"""
import glob
import hashlib
import json
import os
import shutil
from pathlib import Path

MSG = Path(r"C:\Users\17136\xwechat_files\wxid_98nz21egsn2512_23ff\msg")
F = MSG / "attach" / "182f7380f2fc054619aa32e21b0fa0e0" / "2026-11" / "Rec" / "24d5977deb184189" / "F"
DEST = Path(r"C:\Users\17136\Desktop\数据")
PROJECT = Path(__file__).resolve().parents[1]

sources = []
# The EC50 workbook lives outside the F tree.
ec50 = MSG / "file" / "2026-11" / "大型海藻重金属耐受EC50与胁迫前后数据.xlsx"
sources.append((ec50, DEST / "EC50" / ec50.name))
for p in sorted(glob.glob(str(F / "*" / "*.xlsx")) + glob.glob(str(F / "*" / "*.pdf"))):
    src = Path(p)
    sources.append((src, DEST / src.parent.name / src.name))

DEST.mkdir(parents=True, exist_ok=True)
copied, skipped, missing = [], [], []
record = []
for src, dst in sources:
    if not src.exists():
        missing.append(str(src))
        continue
    dst.parent.mkdir(parents=True, exist_ok=True)
    same = dst.exists() and dst.stat().st_size == src.stat().st_size
    if not same:
        shutil.copy2(src, dst)
        copied.append(str(dst))
    else:
        skipped.append(str(dst))
    record.append({
        "group": dst.parent.name,
        "name": src.name,
        "bytes": src.stat().st_size,
        "source": str(src),
        "local": str(dst.relative_to(DEST)).replace("\\", "/"),
    })

out = PROJECT / "data" / "sources.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"源文件: {len(sources)}  复制: {len(copied)}  已存在跳过: {len(skipped)}  缺失: {len(missing)}")
print(f"目标目录: {DEST}")
print(f"总大小: {sum(r['bytes'] for r in record)/1024/1024:.1f} MB")
for g in sorted({r["group"] for r in record}):
    items = [r for r in record if r["group"] == g]
    print(f"  {g}: {len(items)} 个文件")
for m in missing:
    print("MISSING:", m)
