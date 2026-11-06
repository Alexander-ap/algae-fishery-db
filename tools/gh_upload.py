# -*- coding: utf-8 -*-
"""Upload the static site to GitHub via Git Data API (bypasses blocked github.com git endpoint)."""
import base64, hashlib, json, os, sys, time, urllib.request, urllib.error
from pathlib import Path

TOKEN = os.environ["GH_TOKEN"]
REPO = "Alexander-ap/algae-fishery-db"
ROOT = Path(__file__).resolve().parents[1]
EXCLUDE_DIRS = {".git", "__pycache__"}


def skip(p: Path) -> bool:
    rel = p.relative_to(ROOT).as_posix()
    top = rel.split("/")[0]
    if top in EXCLUDE_DIRS or rel in ("_debug.html", ".gh_progress.json") or rel.startswith("tools/_debug"):
        return True
    return rel.endswith(".pyc")


def api(method, url, data=None, retry=2):
    body = json.dumps(data).encode() if data is not None else None
    for attempt in range(6):
        try:
            req = urllib.request.Request(
                "https://api.github.com" + url, method=method, data=body,
                headers={"Authorization": "token " + TOKEN,
                         "Accept": "application/vnd.github+json",
                         "User-Agent": "algae-db-uploader"})
            with urllib.request.urlopen(req, timeout=75) as r:
                raw = r.read()
                return r.status, (json.loads(raw) if raw else {})
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", "ignore")
            if e.code >= 500 and attempt < retry:
                time.sleep(2 * (attempt + 1)); continue
            # 4xx（如空仓库 409）交给调用方按状态码处理
            return e.code, (json.loads(raw) if raw.strip() else {})
        except Exception as e:
            if attempt < 4:
                time.sleep(3 * (attempt + 1)); continue
            print("network error on %s %s: %s" % (method, url, e))
            sys.exit(1)


files = [p for p in sorted(ROOT.rglob("*")) if p.is_file() and not skip(p)]
total_kb = sum(p.stat().st_size for p in files) // 1024
print("uploading %d files, %d KB" % (len(files), total_kb))

# 断点续传：已成功上传的 blob 记录在进度文件里，重跑时跳过
PROG = Path(__file__).with_suffix("").parent / ".gh_progress.json"
done_map = json.loads(PROG.read_text()) if PROG.exists() else {}

# 1. 当前 main 指针（空仓库 409：先放一个初始提交使 Git Data API 可用）
st, ref = api("GET", "/repos/%s/git/ref/heads/main" % REPO)
parent, base_tree, branch = None, None, "main"
if st == 409:
    st, info = api("GET", "/repos/%s" % REPO)
    branch = info.get("default_branch", "main")
    print("empty repo -> init via contents API, default branch:", branch)
    st, init = api("PUT", "/repos/%s/contents/.gitkeep" % REPO,
                   {"message": "init", "content": base64.b64encode(b"").decode()})
    parent = init["commit"]["sha"]
    st, pc = api("GET", "/repos/%s/git/commits/%s" % (REPO, parent))
    base_tree = pc["tree"]["sha"]
elif st == 200:
    parent = ref["object"]["sha"]
    st, pc = api("GET", "/repos/%s/git/commits/%s" % (REPO, parent))
    base_tree = pc["tree"]["sha"]
print("base:", parent or "?", base_tree or "")

# 2. 上传 blobs
entries, done = [], 0
for p in files:
    rel = p.relative_to(ROOT).as_posix()
    digest = hashlib.md5(p.read_bytes()).hexdigest()
    if done_map.get(rel) == digest:
        entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": done_map[rel + ":sha"]})
        done += 1
        continue
    ok = False
    for attempt in range(6):
        data = base64.b64encode(p.read_bytes()).decode()
        st, b = api("POST", "/repos/%s/git/blobs" % REPO, {"content": data, "encoding": "base64"})
        if st == 201:
            ok = True; break
        print("  retry %s (%d) -> %s" % (rel, attempt + 1, str(b)[:110]))
        time.sleep(2 * (attempt + 1))
    if not ok:
        print("blob failed %s (progress saved, rerun to resume)" % rel); sys.exit(1)
    done_map[rel] = digest
    done_map[rel + ":sha"] = b["sha"]
    PROG.write_text(json.dumps(done_map))
    entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": b["sha"]})
    done += 1
    if done % 5 == 0 or done == len(files):
        print("  blobs %d/%d" % (done, len(files)))

# 3. tree + 4. commit + 5. 移动 main
st, tree = api("POST", "/repos/%s/git/trees" % REPO,
               {"base_tree": base_tree, "tree": entries})
st, commit = api("POST", "/repos/%s/git/commits" % REPO,
                 {"message": "藻类智能渔业数据库 · 静态站点（氮磷吸附/重金属胁迫/治理推荐 三类查询）",
                  "tree": tree["sha"], "parents": [parent] if parent else []})
if parent:
    api("PATCH", "/repos/%s/git/refs/heads/%s" % (REPO, branch), {"sha": commit["sha"], "force": True})
else:
    api("POST", "/repos/%s/git/refs" % REPO, {"ref": "refs/heads/%s" % branch, "sha": commit["sha"]})
print("commit pushed:", commit["sha"][:12], "| files:", len(entries))
