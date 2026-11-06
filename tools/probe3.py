# -*- coding: utf-8 -*-
"""Count rows that actually carry values in the two large NP workbooks."""
import os
import re
import zipfile

BASE = r"C:\Users\17136\xwechat_files\wxid_98nz21egsn2512_23ff\msg"
F = os.path.join(BASE, "attach", "182f7380f2fc054619aa32e21b0fa0e0", "2026-11", "Rec", "24d5977deb184189", "F")
FILES = [os.path.join(F, "0", "红藻对NP的吸附.xlsx"), os.path.join(F, "1", "二.绿藻对N P的吸附.xlsx")]

for path in FILES:
    print("=" * 80)
    print(os.path.basename(path))
    with zipfile.ZipFile(path) as z:
        sheets = [n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n)]
        for n in sorted(sheets):
            xml = z.read(n).decode("utf-8", "ignore")
            body = xml.split("<sheetData>", 1)[1].split("</sheetData>", 1)[0]
            with_v, empty, maxr = 0, 0, 0
            for m in re.finditer(r"<row\b[^>]*\br=\"(\d+)\"[^>]*>(.*?)</row>", body, re.S):
                r, content = int(m.group(1)), m.group(2)
                if "<v>" in content or "<is>" in content or "<f" in content:
                    with_v += 1
                    maxr = max(maxr, r)
                else:
                    empty += 1
            print(f"  {n}: rows_with_values={with_v}, last_data_row={maxr}, empty_style_rows={empty}")
