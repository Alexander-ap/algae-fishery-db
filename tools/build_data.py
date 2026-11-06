# -*- coding: utf-8 -*-
"""Build static algae DB from C:/Users/17136/Desktop/数据 (read-only sources)."""
import glob, hashlib, json, re, shutil, zipfile
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
DATA, PAPER_DIR = ROOT / "data", ROOT / "assets" / "papers"
DATA.mkdir(parents=True, exist_ok=True); PAPER_DIR.mkdir(parents=True, exist_ok=True)
D = Path(r"C:\Users\17136\Desktop\数据")
X_RED = D / "0" / "红藻对NP的吸附.xlsx"
X_GREEN = D / "1" / "二.绿藻对N P的吸附.xlsx"
X_EC50 = D / "EC50" / "大型海藻重金属耐受EC50与胁迫前后数据.xlsx"
X_IONLIT = D / "5" / "绿藻对重金属离子吸附文献汇总.xlsx"
X_MICRO = D / "7" / "微藻重金属吸附.xlsx"
X_SCENE = D / "9" / "大型海藻与微藻应用场景对比.xlsx"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def shared(z):
    if "xl/sharedStrings.xml" not in z.namelist(): return []
    out = []
    with z.open("xl/sharedStrings.xml") as f:
        for _e, el in ET.iterparse(f, events=("end",)):
            if el.tag == NS + "si":
                p = []
                for c in el:
                    if c.tag == NS + "t": p.append(c.text or "")
                    elif c.tag == NS + "r":
                        for t in c.iter(NS + "t"): p.append(t.text or "")
                out.append("".join(p)); el.clear()
    return out


def num(v):
    if v is None: return None
    s = str(v).strip()
    if not s or s.upper() in ("NA", "N/A", "NULL", "NAN", "-", "--"): return None
    try:
        f = float(s)
        return int(f) if f.is_integer() and "." not in s and "e" not in s.lower() else round(f, 8)
    except ValueError:
        return s


def read_sheet(path, idx=0):
    with zipfile.ZipFile(path) as z:
        ss = shared(z)
        sheets = sorted([n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", n)],
                        key=lambda n: int(re.search(r"sheet(\d+)", n).group(1)))
        rows, blank, root = [], 0, None
        with z.open(sheets[idx]) as f:
            for ev, el in ET.iterparse(f, events=("start", "end")):
                if ev == "start":
                    if root is None: root = el
                    continue
                if el.tag != NS + "row": continue
                r, cells = int(el.get("r", "0")), {}
                for c in el:
                    if c.tag != NS + "c": continue
                    m = re.match(r"([A-Z]+)", c.get("r", ""))
                    if not m: continue
                    col, t, vn = m.group(1), c.get("t"), c.find(NS + "v")
                    if t == "inlineStr":
                        isn = c.find(NS + "is")
                        val = "".join(x.text or "" for x in isn.iter(NS + "t")) if isn is not None else None
                    elif vn is None: val = None
                    elif t == "s": val = ss[int(vn.text)] if vn.text and int(vn.text) < len(ss) else None
                    elif t in ("str", "e"): val = vn.text
                    elif t == "b": val = vn.text == "1"
                    else: val = num(vn.text)
                    if val is not None and str(val).strip(): cells[col] = val
                if cells: rows.append((r, cells)); blank = 0
                else: blank += 1
                root.clear()
                if blank > 300 and rows: break
        return rows


def as_dict(rows, start_row, cols):
    """Map header columns to values from data rows."""
    out = []
    for r, c in rows:
        if r < start_row: continue
        out.append({k: c.get(col) for k, col in cols.items()})
    return out


def coord(v):
    if v is None: return None
    if isinstance(v, (int, float)): return float(v)
    s = str(v).strip().replace("′", "'").replace("’", "'").replace("″", '"')
    nums = re.findall(r"\d+(?:\.\d+)?", s)
    if not nums: return None
    val = float(nums[0]) + (float(nums[1]) / 60 if len(nums) > 1 else 0) + (float(nums[2]) / 3600 if len(nums) > 2 else 0)
    if re.search(r"[SW]", s, re.I): val = -val
    return round(val, 5)


def ion_key(s):
    s = str(s or "")
    for k, pats in (("Cd", ["Cd", "镉"]), ("Pb", ["Pb", "铅"]), ("Cu", ["Cu", "铜"]),
                    ("Zn", ["Zn", "锌"]), ("Hg", ["Hg", "汞"]), ("Cr", ["Cr", "铬"]),
                    ("Ag", ["Ag", "银"]), ("Al", ["Al", "铝"]), ("As", ["As", "砷"]),
                    ("Ni", ["Ni", "镍"])):
        if any(p in s for p in pats): return k
    return None


PHYLUM_CN = {"Rhodophyta": "红藻门", "Chlorophyta": "绿藻门", "Phaeophyta": "褐藻门",
             "Cyanophyta": "蓝藻门", "Bacillariophyta": "硅藻门", "Ochrophyta": "褐藻门"}
AREA_CN = {"Bohai Sea": "渤海", "Yellow Sea": "黄海", "East China Sea": "东海",
           "South China Sea": "南海", "Bohai": "渤海", "Yellow sea": "黄海"}
SPECIES_CN = {
    "Gracilaria lemaneiformis": "龙须菜", "Gracilaria bailiniae": "江蓠", "Gracilaria domingensis": "江蓠",
    "Pyropia haitanensis": "坛紫菜", "Porphyra haitanensis": "坛紫菜", "Porphyra yezoensis": "条斑紫菜",
    "Ulva lactuca": "石莼", "Ulva pertusa": "孔石莼", "Ulva prolifera": "浒苔",
    "Ulva compressa": "扁浒苔", "Ulva linza": "缘管浒苔", "Enteromorpha prolifera": "浒苔",
    "Enteromorpha linza": "缘管浒苔", "Enteromorpha clathrata": "条浒苔",
    "Sargassum thunbergii": "鼠尾藻", "Sargassum horneri": "铜藻", "Hizikia fusiforme": "羊栖菜",
    "Laminaria japonica": "海带", "Undaria pinnatifida": "裙带菜", "Ceramium virgatum": "仙菜",
    "Chondrus ocellatus": "角叉菜", "Polysiphonia urceolata": "多管藻", "Palmaria palmata": "掌状红皮藻",
    "Chlorella vulgaris": "普通小球藻", "Chlorella pyrenoidosa": "蛋白核小球藻",
    "Dunaliella salina": "杜氏盐藻", "Sarcodia suae": "苏氏红藻", "Scenedesmus obliquus": "斜生栅藻",
}

METRICS = [
    ("X", "tnConc", "TN 浓度", "TN concentration", "mg·L⁻¹", "浓度"),
    ("Y", "nh4Conc", "铵态氮浓度", "NH4+-N concentration", "mg·L⁻¹", "浓度"),
    ("Z", "no3Conc", "硝态氮浓度", "NO3--N concentration", "mg·L⁻¹", "浓度"),
    ("AA", "no2Conc", "亚硝态氮浓度", "NO2--N concentration", "mg·L⁻¹", "浓度"),
    ("AB", "tpConc", "TP 浓度", "TP concentration", "mg·L⁻¹", "浓度"),
    ("AC", "po4Conc", "磷酸盐浓度", "PO43--P concentration", "mg·L⁻¹", "浓度"),
    ("AD", "tnRate", "TN 去除速率", "TN removal rate", "μg·g⁻¹FW·h⁻¹", "去除速率"),
    ("AE", "nh4Rate", "铵态氮去除速率", "NH4+-N removal rate", "μg·g⁻¹FW·h⁻¹", "去除速率"),
    ("AF", "no3Rate", "硝态氮去除速率", "NO3--N removal rate", "μg·g⁻¹FW·h⁻¹", "去除速率"),
    ("AG", "no2Rate", "亚硝态氮去除速率", "NO2--N removal rate", "μg·g⁻¹FW·h⁻¹", "去除速率"),
    ("AH", "tpRate", "TP 去除速率", "TP removal rate", "μg·g⁻¹FW·h⁻¹", "去除速率"),
    ("AI", "po4Rate", "磷酸盐去除速率", "PO43--P removal rate", "μg·g⁻¹FW·h⁻¹", "去除速率"),
    ("AJ", "tnEff", "TN 去除效率", "TN removal efficiency", "%", "去除效率"),
    ("AK", "nh4Eff", "铵态氮去除效率", "NH4+-N removal efficiency", "%", "去除效率"),
    ("AL", "no3Eff", "硝态氮去除效率", "NO3--N removal efficiency", "%", "去除效率"),
    ("AM", "no2Eff", "亚硝态氮去除效率", "NO2--N removal efficiency", "%", "去除效率"),
    ("AN", "tpEff", "TP 去除效率", "TP removal efficiency", "%", "去除效率"),
    ("AO", "po4Eff", "磷酸盐去除效率", "PO43--P removal efficiency", "%", "去除效率"),
    ("AP", "tissueN", "藻体 N 含量", "The tissue N %", "% DW", "组织与总量"),
    ("AQ", "tnAmount", "TN 去除总量", "TN removal amount", "kg", "组织与总量"),
    ("AR", "tissueP", "藻体 P 含量", "The tissue P %", "% DW", "组织与总量"),
    ("AS", "tpAmount", "TP 去除总量", "TP removal amount", "kg", "组织与总量"),
]
GREEN_MAP = {"W": "tnConc", "X": "nh4Conc", "Y": "no3Conc", "Z": "no2Conc",
             "AA": "tpConc", "AB": "po4Conc", "AC": "tnRate", "AD": "tnEff"}
COMMON = {"no": "A", "title": "B", "journal": "C", "author": "D", "year": "E", "country": "F",
          "area": "G", "lonText": "H", "latText": "I", "phylum": "J", "order": "K",
          "family": "L", "genus": "M", "species": "N", "ph": "O", "temp": "P", "sal": "Q",
          "light": "R", "photoperiod": "S", "density": "T", "biomass": "U", "duration": "V"}


def build_np(path, group):
    rows = read_sheet(path, 0)
    key_by_col = {col: key for col, key, _cn, _en, _u, _g in METRICS}
    out = []
    for r, c in rows:
        if r < 2 or not c.get("N"): continue
        rec = {k: c.get(col) for k, col in COMMON.items()}
        rec["category"] = c.get("W") if group == "red" else None
        rec["doi"] = c.get("AV" if group == "red" else "AG")
        rec["dataBy"] = c.get("AT" if group == "red" else "AE")
        rec["verifyBy"] = c.get("AU" if group == "red" else "AF")
        for k in ("no", "year", "ph", "temp", "sal", "light", "photoperiod", "density", "biomass", "duration"):
            rec[k] = num(rec[k])
        rec["lon"], rec["lat"] = coord(rec["lonText"]), coord(rec["latText"])
        rec["phylum"] = str(rec["phylum"] or "").strip()
        rec["phylumCn"] = PHYLUM_CN.get(rec["phylum"], rec["phylum"] or "未标注")
        rec["areaCn"] = AREA_CN.get(str(rec["area"] or "").strip(), rec["area"] or "未标注")
        rec["speciesCn"] = SPECIES_CN.get(str(rec["species"] or "").strip(), "")
        rec["id"] = ("R" if group == "red" else "G") + str(r)
        rec["row"] = r
        rec["group"] = group
        m = {}
        if group == "red":
            for col, key, *_ in METRICS: m[key] = num(c.get(col))
        else:
            for key, *_ in METRICS: m[key] = None
            for col, key in GREEN_MAP.items(): m[key] = num(c.get(col))
        rec["m"] = m
        out.append(rec)
    return out


# small tables ---------------------------------------------------------------
def build_ec50():
    stress, tolerance, notes = [], [], []
    for r, c in read_sheet(X_EC50, 0):
        if r < 3 or not c.get("B"): continue
        stress.append({"no": num(c.get("A")), "ion": ion_key(c.get("B")) or str(c.get("B")),
                       "ionRaw": c.get("B"), "salt": c.get("C"), "conc": num(c.get("D")),
                       "concRaw": c.get("E"), "algaeType": c.get("F"), "phylum": c.get("G"),
                       "species": c.get("H"), "speciesCn": c.get("I"), "duration": c.get("J"),
                       "indicator": c.get("K"), "unit": c.get("L"),
                       "before": num(c.get("M")), "after": num(c.get("N")),
                       "change": num(c.get("O")), "nature": c.get("P"),
                       "tolRank": num(c.get("Q")), "source": c.get("R"), "sourceId": c.get("S")})
    for r, c in read_sheet(X_EC50, 1):
        if r < 3 or not c.get("A"): continue
        tolerance.append({"ion": ion_key(c.get("A")) or str(c.get("A")), "ionRaw": c.get("A"),
                          "rank": num(c.get("B")), "species": c.get("C"), "speciesCn": c.get("D"),
                          "algaeType": c.get("E"), "phylum": c.get("F"), "value": num(c.get("G")),
                          "judge": c.get("H"), "endpoint": c.get("I"), "duration": c.get("J"),
                          "source": c.get("K"), "sourceId": c.get("L")})
    notes_rows = read_sheet(X_EC50, 2)
    rules, refs = [], []
    for r, c in notes_rows:
        a = str(c.get("A") or "").strip()
        if not a: continue
        if re.match(r"^S\d+$", a):
            refs.append({"id": a, "text": str(c.get("B") or "")})
        elif r > 2:
            rules.append(a)
    return stress, tolerance, {"rules": rules, "refs": refs}


def build_simple():
    ionlit, micro, compare, cases = [], [], [], []
    for r, c in read_sheet(X_IONLIT, 0):
        if r < 2 or not c.get("A"): continue
        ionlit.append({"ion": ion_key(c.get("A")), "ionRaw": c.get("A"), "no": num(c.get("B")),
                       "title": c.get("C"), "author": c.get("D"), "year": num(c.get("E")),
                       "species": c.get("F")})
    for r, c in read_sheet(X_MICRO, 0):
        if r < 3 or not c.get("A"): continue
        micro.append({"ion": ion_key(c.get("A")), "ionRaw": c.get("A"), "species": c.get("B"),
                      "group": c.get("C"), "live": c.get("D"), "title": c.get("E"),
                      "authors": c.get("F"), "journal": c.get("G"), "year": num(c.get("H")),
                      "finding": c.get("I")})
    for r, c in read_sheet(X_SCENE, 0):
        if r < 2 or not c.get("A"): continue
        compare.append({"dim": c.get("A"), "macro": c.get("B"), "micro": c.get("C"), "rule": c.get("D")})
    for r, c in read_sheet(X_SCENE, 1):
        if r < 2 or not c.get("A"): continue
        cases.append({"scene": c.get("A"), "plan": c.get("B"), "reason": c.get("C")})
    return ionlit, micro, compare, cases


# reference PDFs --------------------------------------------------------------
# group -> (title, journal, year, authors, algae group, ion keys, doi)
PAPER_META = {
    "3_1": ("Kinetic and equilibrium studies of chromium(VI) biosorption by spent macroalgae Polysiphonia urceolata and Chondrus ocellatus", "Biotechnology & Biotechnological Equipment", 2015, "Ying Xia Li, Yun Wang, Feng Juan Zhao", "红藻", ["Cr"], "10.1080/13102818.2015.1011374"),
    "3_3": ("Comparative study of chromium biosorption by red, green and brown seaweed biomass", "Chemosphere", 2008, "V. Murphy, H. Hughes, P. McLoughlin", "多门类", ["Cr"], "10.1016/j.chemosphere.2007.08.015"),
    "3_5": ("Susceptibility of algae to Cr toxicity reveals contrasting metal management strategies", "Limnology and Oceanography", 2019, "Will Wilson, Qiong Zhang, Rosalind E. M. Rickaby", "多门类", ["Cr"], "10.1002/lno.11183"),
    "3_7": ("Biosorption of heavy metal ions from aqueous solution by red macroalgae", "Journal of Hazardous Materials", 2011, "Wael M. Ibrahim", "红藻", ["Cd", "Pb", "Cu"], "10.1016/j.jhazmat.2011.07.019"),
    "3_9": ("Effects of Cadmium on Bioaccumulation, Bioabsorption, and Photosynthesis in Sarcodia suiae", "Int. J. Environ. Res. Public Health", 2020, "Tai-Wei Han et al.", "红藻", ["Cd"], "10.3390/ijerph17041294"),
    "3_11": ("Metal mobility and bioaccumulation differences at lower trophic levels in marine ecosystems dominated by Sargassum species", "JMBA UK", 2014, "Hernández-Almaraz et al.", "褐藻", ["Cd", "Pb", "Cu", "Zn"], "10.1017/S0025315413001653"),
    "3_13": ("Biosorption of cadmium(II) from aqueous solution by red algae (Ceramium virgatum)", "Journal of Hazardous Materials", 2008, "Ahmet Sarı, Mustafa Tuzen", "红藻", ["Cd"], "10.1016/j.jhazmat.2008.01.008"),
    "3_15": ("Physiological responses of Porphyra haitanensis (Rhodophyta) to copper and cadmium exposure", "Botanica Marina", 2017, "Xifeng Zhu et al.", "红藻", ["Cu", "Cd"], "10.1515/bot-2016-0117"),
    "3_17": ("Phosphate affects susceptivity of Sarcodia suae to arsenate", "European Journal of Phycology", 2022, "M. J. H. Libatique et al.", "红藻", ["As"], "10.1080/09670262.2022.2048268"),
    "3_19": ("The Effects of Lead and Copper on the Cellular Architecture and Metabolism of the Red Alga Gracilaria domingensis", "Microscopy and Microanalysis", 2013, "Gouveia et al.", "红藻", ["Pb", "Cu"], "10.1017/S1431927613000317"),
    "3_21": ("Biosorption: An Interplay between Marine Algae and Potentially Toxic Elements — A Review", "Marine Drugs", 2018, "Muhammad Bilal et al.", "综述", ["Cd", "Pb", "Cu", "Cr", "Hg", "Zn"], "10.3390/md16020065"),
    "6_0": ("浒苔对镉、铅和铝的生物富集动力学研究", "现代食品科技", 2014, "刘智禹, 吴靖娜, 李琳 等", "绿藻", ["Cd", "Pb", "Al"], ""),
    "6_1": ("条浒苔和缘管浒苔对镉胁迫的生理响应比较", "生态学报", 2011, "蒋和平, 郑青松, 朱明 等", "绿藻", ["Cd"], "10.20103/j.stxb.2011.16.005"),
    "6_2": ("Ulva prolifera (Chlorophyta): a suitable material to remove Cd²⁺ from aquatic environments", "Water and Environment Journal", 2017, "Li Huan, Su Hai-xia, Duan Chen-xue 等", "绿藻", ["Cd"], ""),
    "6_3": ("A macroalgae-based biotechnology for water remediation: Simultaneous removal of Cd, Pb and Hg by living Ulva lactuca", "Journal of Environmental Management", 2017, "Bruno Henriques et al.", "绿藻", ["Cd", "Pb", "Hg"], ""),
    "6_5": ("浒苔对海水中重金属的富集研究及食用安全风险评估", "福建水产", 2012, "刘智禹", "绿藻", ["Cd", "Pb"], "10.14012/j.cnki.fjsc.2012.01.001"),
    "6_6": ("浒苔对重金属Pb²⁺的生物吸附及其生理反应", "淮海工学院学报", 2013, "朱明, 郭赣林, 刘兆普", "绿藻", ["Pb"], ""),
    "6_7": ("Simultaneous removal of trace elements from contaminated waters by living Ulva lactuca", "Science of the Total Environment", 2019, "Bruno Henriques et al.", "绿藻", ["Cd", "Pb", "Cu", "Zn", "Hg"], ""),
    "6_8": ("A macroalgae-based biotechnology for water remediation: Simultaneous removal of Cd, Pb and Hg by living Ulva lactuca", "Journal of Environmental Management", 2017, "Bruno Henriques et al.", "绿藻", ["Cd", "Pb", "Hg"], ""),
    "6_10": ("不同 N 水平下缘管浒苔对重金属铜的响应", "海洋通报", 2010, "徐军田, 邹定辉, 朱明 等", "绿藻", ["Cu"], ""),
    "6_11": ("几种大型海藻对海水中重金属污染的生物修复", "中文期刊（扫描版）", 2013, "吕利云", "大型海藻", ["Cd", "Pb", "Cu", "Hg"], ""),
    "6_12": ("孔石莼 (Ulva pertusa) 对铅、铜、镉的吸收", "环境科学与管理", 2008, "魏海峰, 刘长发, 张俊新 等", "绿藻", ["Pb", "Cu", "Cd"], ""),
    "6_13": ("Copper Is Accumulated as Copper Sulfide Particles, and Not Bound to Glutathione, Phytochelatins or Metallothioneins, in the Marine Alga Ulva compressa", "Int. J. Molecular Sciences", 2024, "Stephanie Romero et al.", "绿藻", ["Cu"], ""),
    "6_15": ("几种大型海藻对海水中重金属污染的生物修复", "中文期刊（扫描版）", 2013, "吕利云", "大型海藻", ["Cd", "Pb", "Cu", "Hg"], ""),
    "6_16": ("A macroalgae-based biotechnology for water remediation (2): Simultaneous removal of Cd, Pb and Hg by living Ulva lactuca", "Journal of Environmental Management", 2017, "Bruno Henriques et al.", "绿藻", ["Cd", "Pb", "Hg"], ""),
    "8_0": ("微藻矿化去除 Pb²⁺ 的研究", "高校地质学报", 2015, "韩冉, 林文挺, 杨鹏 等", "微藻", ["Pb"], "10.16108/j.issn1006-7493.2015208"),
    "8_2": ("活体微藻对镉(Ⅱ)的富集机理", "环境工程学报", 2018, "蒋心诚, 李彩云, 周旭东 等", "微藻", ["Cd"], "10.12030/j.cjee.201710054"),
    "8_4": ("微藻对无机汞和甲基汞的吸附和吸收特性", "环境化学", 2017, "刘军晖, 麻冰涓, 毛宇翔 等", "微藻", ["Hg"], "10.7524/j.issn.0254-6108.2017.07.2016110701"),
    "8_6": ("Effects of metal quantity and quality to the removal of zinc and copper by two common green microalgae (Chlorophyceae) species", "Phycological Research", 2020, "Zoltán Novák et al.", "微藻", ["Zn", "Cu"], "10.1111/pre.12422"),
}


def abstract_of(path):
    try:
        with pdfplumber.open(path) as pdf:
            txt = ""
            for pg in pdf.pages[:3]:
                txt += (pg.extract_text() or "") + "\n"
                if len(txt) > 4500: break
    except Exception:
        return ""
    txt = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", txt)
    m = re.search(r"(?:Abstract|ABSTRACT|摘\s*要|摘要)[:：\s]*(.{50,700})", txt, re.S)
    s = re.sub(r"\s+", " ", (m.group(1) if m else txt[:500])).strip()
    # 摘要常与下一节标题连排（如 "...physiol- Introduction"），先截到章节/关键词标记
    s = re.split(r"\s+(?:\d+\s*[.、]?\s*)?(?:Introduction|INTRODUCTION|Key\s*words|Keywords|KEYWORDS)\b|\s*关键词[:：]?", s)[0].strip()
    # 再去掉结尾被截断的断词残片，避免 "physiol-" 这类半截词
    s = re.sub(r"\s+\S{0,12}-\s*$", "", s).strip()
    if len(s) > 300:
        cut = s.rfind(" ", 0, 300)
        s = (s[:cut] if cut > 200 else s[:300]).rstrip(" ,;:-") + "…"
    ascii_ratio = sum(1 for ch in s if ord(ch) < 128) / max(1, len(s))
    space_ratio = s.count(" ") / max(1, len(s))
    # 部分英文 PDF 的文本层丢失词间空格，整段连写；此时不展示摘要，改由原文链接查阅
    if ascii_ratio > 0.8 and space_ratio < 0.07:
        return ""
    # 出版商页眉/版权行冒充摘要（如 Elsevier "journal homepage: www.elsevier.com/locate/..."）同样丢弃
    if re.search(r"journal homepage|Contents lists available|elsevier\.com/locate|sciencedirect\.com|doi\.org/|©\s*20\d\d", s, re.I):
        return ""
    return s


def build_papers():
    files = sorted(glob.glob(str(D / "*" / "*.pdf")))
    seen, papers = {}, []
    for p in files:
        path = Path(p); g = path.parent.name
        if g not in PAPER_META: continue
        digest = hashlib.md5(path.read_bytes()).hexdigest()
        title, journal, year, authors, group, ions, doi = PAPER_META[g]
        if digest in seen:
            seen[digest]["copies"].append(path.name)
            continue
        fid = "P%02d" % (len(papers) + 1)
        dest = PAPER_DIR / (fid + ".pdf")
        # 源 PDF 多带 ReadOnly 属性，copy2 会把它带到站点副本上；
        # 重建时覆盖只读文件在 Windows 会抛 PermissionError。
        # 先清掉只读位，内容一致就跳过复制，内容变化才覆盖，使管线可重复执行。
        if dest.exists() and not (dest.stat().st_mode & 0o200):
            dest.chmod(0o666)
        if not (dest.exists() and hashlib.md5(dest.read_bytes()).hexdigest() == digest):
            shutil.copy2(path, dest)
            dest.chmod(0o666)
        rec = {"id": fid, "title": title, "journal": journal, "year": year, "authors": authors,
               "group": group, "ions": ions, "doi": doi, "abstract": abstract_of(path),
               "file": "assets/papers/" + fid + ".pdf", "origin": g + "/" + path.name, "copies": []}
        papers.append(rec); seen[digest] = rec
    return papers


def main():
    red, green = build_np(X_RED, "red"), build_np(X_GREEN, "green")
    stress, tolerance, notes = build_ec50()
    ionlit, micro, compare, cases = build_simple()
    papers = build_papers()
    sources = json.loads((DATA / "sources.json").read_text(encoding="utf-8")) if (DATA / "sources.json").exists() else []
    metric_defs = [{"col": col, "key": key, "cn": cn, "en": en, "unit": unit, "group": grp,
                    "red": True, "green": key in GREEN_MAP.values()}
                   for col, key, cn, en, unit, grp in METRICS]
    ions = sorted({x["ion"] for x in tolerance} | {x["ion"] for x in stress} |
                  {i for x in ionlit for i in [x["ion"]]} | {i for p in papers for i in p["ions"]})
    db = {
        "meta": {"generated": date.today().isoformat(), "sourceDir": str(D),
                 "counts": {"npRed": len(red), "npGreen": len(green), "stress": len(stress),
                            "tolerance": len(tolerance), "ionLit": len(ionlit), "papers": len(papers),
                            "micro": len(micro), "compare": len(compare), "cases": len(cases)},
                 "metrics": metric_defs, "ions": ions, "sources": sources},
        "np": {"red": red, "green": green},
        "stress": stress, "tolerance": tolerance, "notes": notes, "ionLit": ionlit,
        "micro": micro, "compare": compare, "cases": cases, "papers": papers,
    }
    payload = json.dumps(db, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    (DATA / "database.json").write_text(payload, encoding="utf-8")
    (DATA / "db.js").write_text("window.ALGAE_DB=" + payload + ";", encoding="utf-8")
    print("counts:", db["meta"]["counts"])
    print("ions:", ions)
    print("papers unique:", len(papers), " duplicates folded:", sum(len(p["copies"]) for p in papers))
    print("db.js size: %.1f KB" % ((DATA / "db.js").stat().st_size / 1024))
    print("phylum red:", {p: sum(1 for r in red if r["phylum"] == p) for p in {r["phylum"] for r in red}})
    print("phylum green:", {p: sum(1 for r in green if r["phylum"] == p) for p in {r["phylum"] for r in green}})


if __name__ == "__main__":
    main()
