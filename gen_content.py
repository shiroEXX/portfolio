#!/usr/bin/env python3
# 解析飞书已提取资产 -> /workspace/site/content.js，并下载 B站封面到 assets/covers/
import json, re, glob, os, urllib.request

BASE = "/workspace/baseraw"
SCRIPTS = "/workspace/scripts"
SITE = "/workspace/site"
COVERS = f"{SITE}/assets/covers"
os.makedirs(COVERS, exist_ok=True)

def md_rows(path):
    rows = []
    for line in open(path, encoding="utf-8"):
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
    except Exception:
        return ""

def download(url, path):
    if not url: return False
    try:
        req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0","Referer":"https://www.bilibili.com"})
        data = urllib.request.urlopen(req, timeout=20).read()
        with open(path, "wb") as f: f.write(data)
        return len(data) > 0
    except Exception:
        return False

# ---------- 13 篇脚本正文（按文件名顺序 = T3 已发布顺序） ----------
script_files = sorted(glob.glob(f"{SCRIPTS}/??_*.md"))
def script_text(path):
    txt = open(path, encoding="utf-8").read()
    try: return json.loads(txt)["data"]["document"]["content"]
    except Exception: return txt

# ---------- T3: 13 条主编视频 + T1: 全部 51 条 ----------
t3 = md_rows(f"{BASE}/T3_topics.md")
# 列: 1标题 2链接 3状态 ... 5红心 6评论 7封面 8发布文案 9渠道 10点赞 11日期 12主编话 13视频号互动 14视频号播放 15转发
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
print(f"featured=13, 封面缺失: {[f['title'] for f in featured if not f['cover']]}")
print(f"脚本缺失: {[f['title'] for f in featured if not f['script']]}")

# 全部 51 条（含封面）
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

# ---------- campaign ----------
t5 = md_rows(f"{BASE}/T5_winter_summary.md")
winter = {clean(c[1]): clean(c[2]) for c in t5 if len(c) >= 3 and clean(c[1])}
t6 = md_rows(f"{BASE}/T6_winAI.md")
win = [{"channel": clean(c[1]), "exposureW": clean(c[2]), "project": clean(c[3])}
       for c in t6 if len(c) >= 4 and clean(c[1])]

data = {
  "profile": {
    "name": "谢智聪", "role": "品牌部 · 内容主编 / 营销传播",
    "tagline": "用 AI 的视角，解码现象背后的先进技术——「超级AI研究所」内容主理人",
    "intro": "深耕科技品牌内容建设与整合营销传播。主导「超级AI研究所」AI 科普视频账号的选题、脚本与发布，并操盘阿里云米兰冬奥 AIGC 全球大赛、《赢在AI+》等品牌 campaign。",
    "contact": "站内作品即我的项目经历缩影；如需进一步沟通，欢迎邮件联系。"
  },
  "featuredVideos": featured,
  "allVideos": all_videos,
  "campaigns": [
    {"name":"阿里云米兰冬奥会 AIGC 全球大赛","tagline":"全球创作者 · AI+冬奥 共创",
     "summary":"面向全球创作者的 AIGC 命题赛事，以通义万相等工具邀请世界各地创作者用 AI 重新诠释冬奥，实现品牌全球化创意共创。",
     "metrics": winter,
     "highlights":["127 个国家/地区参与","15,000 件 AIGC 作品投稿","国内 9.8 亿 + 国际 2 亿曝光","全网 473 万互动"]},
    {"name":"《赢在AI+》第一季","tagline":"整合传播 · 多频道破圈",
     "summary":"综艺化 IP 传播项目，整合 TVC、微博话题页、视频号、央视频与稿件多渠道，形成「话题引爆 + TVC 背书 + 视频号渗透 + 稿件沉淀」的传播范式。",
     "metrics": {"合计曝光(万)":"约 32,268"},
     "channels": win}
  ]
}
with open(f"{SITE}/content.js","w",encoding="utf-8") as f:
    f.write("window.SITE_DATA = "); json.dump(data, f, ensure_ascii=False, indent=2); f.write(";\n")
print("content.js written; covers:", len(os.listdir(COVERS)))
