# -*- coding: utf-8 -*-
"""Check text-layer availability of the reference PDFs."""
import glob
import os
import pdfplumber

F = r"C:\Users\17136\xwechat_files\wxid_98nz21egsn2512_23ff\msg\attach\182f7380f2fc054619aa32e21b0fa0e0\2026-11\Rec\24d5977deb184189\F"
files = sorted(glob.glob(os.path.join(F, "*", "*.pdf")))
for p in files[:8] + files[12:15] + files[-4:]:
    try:
        with pdfplumber.open(p) as pdf:
            txt = (pdf.pages[0].extract_text() or "").strip()
        print("=" * 90)
        print(os.path.basename(p), "| pages/char:", len(txt))
        print(txt[:700].replace("\n", " / "))
    except Exception as e:
        print("ERR", os.path.basename(p), e)
