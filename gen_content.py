#!/usr/bin/env python3
# 解析飞书已提取资产 -> /workspace/site/content.js（适配新版Tab布局）
import json, re, glob, os, urllib.request
from collections import Counter

BASE = "/workspace/baseraw"
SCRIPTS = "/workspace/scripts"
SITE = "/workspace/site"
COVERS = f"{SITE}/assets/covers"
os.makedirs(COVERS, exist_ok=True)

def md_rows(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if s.startswith("| rec") or s.startswith("|rec"):
                rows.append([c.strip() for c in s.strip("|").split("|")])
    return rows

def clean(v): return v.strip() if v else ""
def bvid_of(link):
    m = re.search(r"BV[0-9A-Za-z]+", link or "")
    return m.group(0) if m else ""

def bili_pic(bvid):
    if not bvid: return ""
    url = "https://api.bilibili.com/x/web-interface/view?bvid=" + bvid
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0","Referer":"https://www.bilibili.com"})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=15).read()).get("data", {}).get("pic", "")
    except Exception: return ""

def download(url, path):
    if not url: return False
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0","Referer":"https://www.bilibili.com"})
        data = urllib.request.urlopen(req, timeout=20).read()
        with open(path, "wb") as f: f.write(data)
        return len(data) > 0
    except Exception: return False

# ---------- 13 篇脚本正文 ----------
script_files = sorted(glob.glob(f"{SCRIPTS}/??_*.md"))
def script_text(path):
    txt = open(path, encoding="utf-8").read()
    try: return json.loads(txt)["data"]["document"]["content"]
    except Exception: return txt

# ---------- T3: 13 条主编视频 ----------
t3 = md_rows(f"{BASE}/T3_topics.md")
featured = []
for c in t3:
    if len(c) < 16: continue
    if "已发布" not in c[3]: continue
    featured.append(c)
assert len(featured) == 13, f"featured 数量异常: {len(featured)}"

for i, c in enumerate(featured):
    bvid = bvid_of(clean(c[2]))
    cov = f"assets/covers/{bvid}.jpg"
    if not download(bili_pic(bvid), f"{SITE}/{cov}"): cov = ""
    featured[i] = {
        "title": clean(c[1]), "bvid": bvid, "cover": cov,
        "publishCopy": clean(c[8]), "editorNote": clean(c[12]),
        "channel": clean(c[9]).replace('"',''), "date": clean(c[11]),
        "metrics": {"redHeart": clean(c[5]), "comment": clean(c[6]),
                    "like": clean(c[10]), "forward": clean(c[15]),
                    "vhInteract": clean(c[13]), "vhPlayW": clean(c[14])},
        "script": script_text(script_files[i]),
    }
print(f"featured=13")

# ---------- T1: 全部 51 条 ----------
t1 = md_rows(f"{BASE}/T1_video.md")
all_videos = []
for c in t1:
    if len(c) < 11 or not clean(c[1]): continue
    bvid = bvid_of(clean(c[5]))
    cov = f"assets/covers/{bvid}.jpg"
    if not download(bili_pic(bvid), f"{SITE}/{cov}"): cov = ""
    all_videos.append({"title": clean(c[1]), "playW": clean(c[2]), "like": clean(c[3]),
        "comment": clean(c[4]), "bvid": bvid, "cover": cov,
        "redHeart": clean(c[6]), "status": clean(c[7]), "forward": clean(c[8]),
        "isEditor": ("是" in c[9]), "total": clean(c[10])})
print(f"allVideos={len(all_videos)}")

# ---------- T5: 冬奥汇总 ----------
t5 = md_rows(f"{BASE}/T5_winter_summary.md")
winter_raw = {clean(c[1]): clean(c[2]) for c in t5 if len(c) >= 3 and clean(c[1])}
winter_metrics = {
    "countries": winter_raw.get("参赛国家/地区", "127"),
    "submissions": "15000",
    "domesticExposure": winter_raw.get("国内曝光量", "980000000"),
    "intlExposure": winter_raw.get("国际曝光量", "200000000"),
    "interactions": winter_raw.get("全网互动量", "4730000"),
}

# ---------- T6: 赢在AI+ ----------
# 从渠道表计算总曝光
t6 = md_rows(f"{BASE}/T6_winAI.md")
total_exposure = 0
for c in t6:
    if len(c) >= 3 and clean(c[2]):
        try: total_exposure += float(clean(c[2].replace(',','')))
        except: pass
winai_exposure = int(total_exposure) if total_exposure > 0 else 32268

# ---------- T4: 国家地图数据 ----------
INVALID = {'FALSE', 'NA', 'N/A', '', 'NULL', 'null', 'false', 'n/a'}
COUNTRY_NAMES = {
    "PH":"菲律宾","IN":"印度","ES":"西班牙","CN":"中国","ID":"印尼","MY":"马来西亚",
    "CA":"加拿大","TH":"泰国","IT":"意大利","GB":"英国","US":"美国","NG":"尼日利亚",
    "UA":"乌克兰","PK":"巴基斯坦","CY":"塞浦路斯","HN":"洪都拉斯","NL":"荷兰",
    "GT":"危地马拉","PT":"葡萄牙","DM":"多米尼克","FR":"法国","SG":"新加坡",
    "MX":"墨西哥","SE":"瑞典","MM":"缅甸","LA":"老挝","KH":"柬埔寨","CH":"瑞士",
    "CZ":"捷克","PA":"巴拿马","FI":"芬兰","NI":"尼加拉瓜","VN":"越南","AT":"奥地利",
    "TR":"土耳其","LI":"列支敦士登","CR":"哥斯达黎加","KE":"肯尼亚","SR":"苏里南",
    "JP":"日本","BZ":"伯利兹","RS":"塞尔维亚","BR":"巴西","SK":"斯洛伐克","ML":"马里",
    "GQ":"赤道几内亚","GA":"加蓬","MG":"马达加斯加","BJ":"贝宁","SV":"萨尔瓦多",
    "HU":"匈牙利","GM":"冈比亚","BI":"布隆迪","UG":"乌干达","BA":"波黑","DJ":"吉布提",
    "SO":"索马里","VE":"委内瑞拉","JM":"牙买加","KR":"韩国","LR":"利比里亚","GN":"几内亚",
    "IS":"冰岛","DE":"德国","ME":"黑山","MZ":"莫桑比克","TN":"突尼斯","LU":"卢森堡",
    "LV":"拉脱维亚","SA":"沙特阿拉伯","RO":"罗马尼亚","VC":"圣文森特","HT":"海地",
    "AR":"阿根廷","JO":"约旦","CM":"喀麦隆","LY":"利比亚","ET":"埃塞俄比亚",
    "BF":"布基纳法索","KY":"开曼群岛","TG":"多哥","BY":"白俄罗斯","MU":"毛里求斯",
    "BW":"博茨瓦纳","SI":"斯洛文尼亚","GR":"希腊","CV":"佛得角","RU":"俄罗斯",
    "PE":"秘鲁","NA":"纳米比亚","BD":"孟加拉","NP":"尼泊尔","LK":"斯里兰卡",
    "IR":"伊朗","IQ":"伊拉克","IL":"以色列","EG":"埃及","ZA":"南非","GH":"加纳",
    "CI":"科特迪瓦","SN":"塞内加尔","MA":"摩洛哥","DZ":"阿尔及利亚","AO":"安哥拉",
    "ZM":"赞比亚","ZW":"津巴布韦","RW":"卢旺达","MW":"马拉维","TZ":"坦桑尼亚",
}
t4_rows = []
with open(f"{BASE}/T4_winter_intl.md", "r") as f:
    for line in f:
        s = line.strip()
        if s.startswith("| rec") or s.startswith("|rec"):
            cols = [c.strip() for c in s.strip("|").split("|")]
            if len(cols) >= 3: t4_rows.append(cols[2])

valid_countries = [r for r in t4_rows if r not in INVALID and len(r) <= 4 and r.isalpha()]
c_counter = Counter(valid_countries)
max_count = max(c_counter.values()) if c_counter else 1

map_data = {}
for code, count in c_counter.items():
    name = COUNTRY_NAMES.get(code, code)
    intensity = round(min(count / max_count, 1), 2)
    map_data[code] = {"name": name, "count": count, "intensity": intensity}

map_data_sorted = dict(sorted(map_data.items(), key=lambda x: x[1]['count'], reverse=True))

# ---------- 组装输出 ----------
data = {
  "profile": {
    "name": "谢智聪",
    "role": "品牌内容主编 · AI科普IP主理人 · 整合营销传播",
    "tagline": "此网站为个人过往项目案例作品集",
  },
  "featuredVideos": featured,
  "allVideos": all_videos,
  "winterMetrics": winter_metrics,
  "winAIExposure": winai_exposure,
  "mapData": {
    "totalCountries": len(map_data),
    "totalSubmissions": len(valid_countries),
    "maxCount": max_count,
    "countries": map_data_sorted
  }
}

with open(f"{SITE}/content.js","w",encoding="utf-8") as f:
    f.write("window.SITE_DATA = "); json.dump(data, f, ensure_ascii=False, indent=2); f.write(";\n")
print(f"content.js written; covers: {len(os.listdir(COVERS))}; countries: {len(map_data)}")
