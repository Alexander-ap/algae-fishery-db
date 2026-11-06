# -*- coding: utf-8 -*-
"""Real-browser verification via headless Chrome --dump-dom (no dev server needed)."""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = (ROOT / "index.html").as_uri()
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
EXPECT = {
    "overview": ("view-overview", "总览驾驶舱", "kpiGrid"),
    "np": ("view-np", "氮磷吸附查询", "npResult"),
    "metal": ("view-metal", "重金属离子胁迫", "metalResult"),
    "scene": ("view-scene", "治理方案推荐", "sceneResult"),
    "sources": ("view-sources", "数据与文献源", "sourcesList"),
}

fail = 0
for key, (sid, crumb, result_id) in EXPECT.items():
    profile = Path(tempfile.gettempdir()) / ("adb_verify_" + key)
    cmd = [CHROME, "--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions",
           "--enable-logging=stderr", "--v=0", "--user-data-dir=" + str(profile),
           "--virtual-time-budget=4000", "--dump-dom", URL + "#" + key]
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=90)
    dom, err = p.stdout, p.stderr
    active = re.search(r'<section class="([^"]*view active[^"]*)" id="([^"]+)"', dom)
    crumb_m = re.search(r'id="crumbTitle"[^>]*>([^<]*)', dom)
    ridx = dom.find('id="' + result_id + '"')
    segment = dom[ridx:ridx + 120000] if ridx >= 0 else ""
    content_len = len(re.sub(r"<[^>]+>", "", segment))
    console_errors = [l for l in err.splitlines() if "CONSOLE" in l and ("Uncaught" in l or "Error" in l)]
    ok = (active and active.group(2) == sid and crumb_m and crumb_m.group(1) == crumb
          and content_len > 800 and not console_errors)
    print(("PASS " if ok else "FAIL ") + key +
          " | active=" + (active.group(2) if active else "none") +
          " | crumb=" + (crumb_m.group(1) if crumb_m else "none") +
          " | result_chars=" + str(content_len) +
          " | console_errors=" + str(len(console_errors)))
    if console_errors:
        print("   ", console_errors[0][:220])
    if not ok:
        fail += 1

print("\n浏览器验证：%d/%d 通过" % (len(EXPECT) - fail, len(EXPECT)))
sys.exit(1 if fail else 0)
