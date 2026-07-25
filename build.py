#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build.py — 重新读取飞书多维表格本地快照，生成统一结构化数据 data/site-data.js
数据源：/workspace/baseraw (T1 视频数据 / T5 冬奥数据汇总 / T6 赢在AI+传播)
复用：/workspace/site/assets/map-data.json（89 国参与数据）
说明：profile / services / about / contact 中「经历/教育/联系方式」为基于角色与项目的专业文案，
      集中在数据文件中，便于用户审阅后一处修改（数据驱动，不写死在 HTML）。
"""
import json, re, os

BASE = "/workspace/baseraw"
SITE = "/workspace/site"
DATA = f"{SITE}/data"
MEDIA = "assets/media"
COVERS = "assets/covers"
SCRIPTS = "/workspace/scripts"
os.makedirs(DATA, exist_ok=True)


def md_rows(path):
    rows = []
    if not os.path.exists(path):
        return rows
    for line in open(path, encoding="utf-8"):
        s = line.strip()
        if s.startswith("| rec") or s.startswith("|rec"):
            rows.append([c.strip() for c in s.strip("|").split("|")])
    return rows


def clean(v):
    return (v or "").strip()


def num(x):
    x = (x or "").replace("万", "").replace("，", "").replace(",", "").replace("%", "").strip()
    try:
        return float(x)
    except Exception:
        return 0.0


def bvid_of(link):
    m = re.search(r"BV[0-9A-Za-z]+", link or "")
    return m.group(0) if m else ""


def fmt(n):
    """千分位格式化（中文）。"""
    try:
        return f"{int(round(n)):,}"
    except Exception:
        return str(n)


def norm(s):
    """归一化标题：去空白与常见标点/引号，便于模糊匹配。"""
    import unicodedata
    s = (s or "").replace("【AIGC视频】", "").replace("【", "").replace("】", "")
    s = s.replace("“", "").replace("”", "").replace('"', "").replace("'", "")
    s = s.replace("「", "").replace("」", "").replace("(", "").replace(")", "")
    s = s.replace("（", "").replace("）", "").replace("：", "").replace(":", "")
    s = s.replace("，", "").replace(",", "").replace("！", "").replace("!", "")
    s = s.replace("?", "").replace("？", "").replace("、", "").replace("·", "")
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return re.sub(r"\s+", "", s)


def parse_scripts():
    """读取 /workspace/scripts 下 13 个 JSON 脚本，返回 {归一化标题: 正文}。"""
    out = {}
    if not os.path.isdir(SCRIPTS):
        return out
    for fn in sorted(os.listdir(SCRIPTS)):
        if not fn.endswith(".md"):
            continue
        try:
            raw = json.load(open(f"{SCRIPTS}/{fn}", encoding="utf-8"))
            content = raw["data"]["document"]["content"]
        except Exception:
            continue
        m = re.search(r"#\s*(.+)", content)
        heading = clean(m.group(1)) if m else ""
        out[norm(heading)] = content
    return out


SCRIPTS_MAP = parse_scripts()


# ============================================================
# 1) 超级AI研究所（AI Lab）—— 来自 T1 视频数据
# ============================================================
t1 = md_rows(f"{BASE}/T1_video.md")
videos, plays_total, inter_total, main_count, published = [], 0.0, 0.0, 0, 0
for r in t1:
    if len(r) < 11:
        continue
    title, status, link = clean(r[1]), clean(r[7]), clean(r[5])
    if not title or "已发布" not in status:
        continue
    bvid = bvid_of(link)
    plays = num(r[2])          # 单位：万
    inter = num(r[10])         # 单位：次
    plays_total += plays
    inter_total += inter
    published += 1
    is_main = clean(r[9]) == '["是"]'
    if is_main:
        main_count += 1
    cover = f"{COVERS}/{bvid}.jpg" if bvid else ""
    videos.append({
        "title": title,
        "bvid": bvid,
        "url": f"https://www.bilibili.com/video/{bvid}" if bvid else "",
        "cover": cover,
        "plays": int(plays * 10000),
        "interactions": int(inter),
        "isMain": is_main,
    })
featured = [v for v in videos if v["isMain"]]
ai_lab_kv = featured[0]["cover"] if featured else (videos[0]["cover"] if videos else "")

# ---- 为 featured 视频匹配「内容脚本」（按 H1 标题归一化匹配）----
def attach_scripts(feats):
    matched, fallback = 0, 0
    for v in feats:
        key = norm(v["title"])
        # 精确归一化匹配
        if key in SCRIPTS_MAP:
            v["script"] = SCRIPTS_MAP[key]
            v["scriptTitle"] = v["title"]
            matched += 1
            continue
        # 兜底：脚本标题为视频标题的子串 / 视频标题为脚本标题的子串
        hit = None
        for k, c in SCRIPTS_MAP.items():
            if key and (key in k or k in key):
                hit = c
                break
        if hit:
            v["script"] = hit
            v["scriptTitle"] = v["title"]
            fallback += 1
        else:
            v["script"] = ""
            v["scriptTitle"] = v["title"]
    print(f"  脚本匹配：精确 {matched} / 兜底 {fallback} / 未匹配 {len(feats) - matched - fallback}")
    return feats

featured = attach_scripts(featured)

# ============================================================
# 2) 冬奥 AIGC —— 来自 T5 数据汇总 + map-data.json
# ============================================================
t5 = md_rows(f"{BASE}/T5_winter_summary.md")
winter_metrics = {"countries": 0, "submissions": 0, "domesticExposure": 0, "intlExposure": 0, "interactions": 0}
for r in t5:
    if len(r) < 3:
        continue
    dim, val = clean(r[1]), clean(r[2])
    if "参赛国家" in dim:
        winter_metrics["countries"] = int(num(val))
    elif "投稿" in dim:
        winter_metrics["submissions"] = int(num(val))
    elif "国内曝光" in dim:
        winter_metrics["domesticExposure"] = int(num(val))
    elif "国际曝光" in dim:
        winter_metrics["intlExposure"] = int(num(val))
    elif "互动" in dim:
        winter_metrics["interactions"] = int(num(val))

map_data = {}
map_path = f"{SITE}/assets/map-data.json"
if os.path.exists(map_path):
    try:
        map_data = json.load(open(map_path, encoding="utf-8"))
    except Exception:
        map_data = {}

# ============================================================
# 3) 赢在AI+ —— 来自 T6 传播数据（曝光量求和，单位：万）
# ============================================================
t6 = md_rows(f"{BASE}/T6_winAI.md")
winai_exp_w = 0.0
for r in t6:
    if len(r) < 3:
        continue
    winai_exp_w += num(r[2])
winai_exp_w = round(winai_exp_w, 1)  # 万

# ============================================================
# 4) 组装统一数据模型
# ============================================================
SITE_DATA = {
    "profile": {
        "name": "谢智聪",
        "role": "品牌内容主编 · AI 科普 IP 主理人 · 整合营销传播",
        "tagline": "以 AI 的视角，解码现象背后的先进技术",
        "bio": "深耕科技品牌内容建设与整合营销传播，长期负责阿里云「超级 AI 研究所」AI 科普 IP 的内容策划与主编工作，并主导米兰冬奥 AIGC 全球大赛、《赢在 AI+》等国家级传播 campaign 的内容与传播落地。擅长把硬核技术翻译成大众可感知的叙事，以内容驱动品牌增长。",
        "location": "中国 · 杭州",
    },
    "projects": [
        {
            "id": "ai-lab",
            "name": "超级 AI 研究所",
            "accent": "#2563eb",
            "tagline": "硬科技，软表达 —— AI 科普短视频 IP",
            "description": "阿里云及旗下产品的「技术品牌内容化外溢」阵地，以「引入—分幕解码—价值升华—品牌软收」四段式口播，把通义、万相 Wan、无影、夸克等产品的技术能力，翻译成人人能懂的科普故事。视频首发 B 站、主阵地视频号，矩阵覆盖小红书、YouTube。",
            "role": "品牌内容主编 · AI 科普 IP 主理人",
            "results": [
                {"label": "已发布视频", "value": fmt(published), "suffix": "支"},
                {"label": "全网播放", "value": fmt(plays_total * 10000), "suffix": "次"},
                {"label": "总互动", "value": fmt(inter_total), "suffix": "次"},
                {"label": "主编主导", "value": fmt(main_count), "suffix": "支"},
            ],
            "links": [
                {"label": "B 站 · 超级 AI 研究所", "url": "https://search.bilibili.com/all?keyword=超级AI研究所"},
                {"label": "视频号", "url": ""},
            ],
            "tags": ["AI 科普", "短视频", "内容主编", "整合营销", "IP 主理人"],
            "kv": ai_lab_kv,
            "videos": videos,
            "featured": featured,
            "metrics": None,
            "mapData": None,
        },
        {
            "id": "winter",
            "name": "米兰冬奥 AIGC 全球大赛",
            "accent": "#059669",
            "tagline": "「意」展你风采 · 全球首个官方奥运粉丝 AIGC 互动",
            "description": "奥林匹克官方云服务合作伙伴阿里云，携手国际奥委会与米兰-科尔蒂纳 2026 冬奥组委会，共同发起全球首个官方奥运粉丝 AIGC 互动项目。全球创作者基于阿里云通义大模型，围绕花样滑冰、短道速滑、高山滑雪、单板滑雪四项运动进行 AIGC 创作；TOP100 作品汇聚为奥运史上首个 AIGC 数字艺术作品《YOUR EPIC VIBE》，纳入奥林匹克博物馆馆藏，并在瑞士洛桑、意大利米兰、中国杭州三地联展。",
            "role": "项目内容负责人 · AIGC 内容策划与制作",
            "results": [
                {"label": "参与国家/地区", "value": fmt(winter_metrics["countries"]), "suffix": "国"},
                {"label": "投稿作品", "value": fmt(winter_metrics["submissions"]), "suffix": "件"},
                {"label": "全球总曝光", "value": fmt((winter_metrics["domesticExposure"] + winter_metrics["intlExposure"]) / 100000000), "suffix": "亿+"},
                {"label": "全网互动", "value": fmt(winter_metrics["interactions"] / 10000), "suffix": "万+"},
            ],
            "links": [
                {"label": "大赛官网（已结束）", "url": "https://summit.aliyun.com/aigcchampionship"},
                {"label": "国际互动站", "url": "https://alibabacloud.aigcchampionship.com"},
                {"label": "国内互动站", "url": "https://aliyun.aigcchampionship.com"},
            ],
            "tags": ["AIGC", "冬奥", "国际传播", "品牌出海", "UGC 共创"],
            "kv": f"{MEDIA}/winter_kv.png",
            "videos": [
                {"name": "Teaser 预热片", "src": f"{MEDIA}/winter_teaser.mp4"},
                {"name": "TOP100 作品集锦", "src": f"{MEDIA}/winter_top100.mp4"},
            ],
            "metrics": winter_metrics,
            "mapData": map_data,
        },
        {
            "id": "winai",
            "name": "《赢在 AI+》第一季",
            "accent": "#dc2626",
            "tagline": "央视 × 杭州政府 · 国内 AI 领域大型纪实创投节目",
            "description": "由中央广播电视总台、杭州市人民政府联合主办的国内 AI 领域大型纪实创投节目，阿里云作为节目战略合作伙伴（官方身份：云计算 AI 独家合作伙伴）。节目紧跟国家战略，聚焦 AI 时代，通过创意阐述、行业调研、融资议价等环节，为创新创业者提供施展才华的舞台，推动人工智能与各行各业深度融合。全 10 期覆盖机器革命、智能终端、AI 设计、未来医疗、智能芯算等主题。",
            "role": "传播策划 · 整合营销落地",
            "results": [
                {"label": "总曝光", "value": fmt(winai_exp_w / 10000), "suffix": "亿+"},
                {"label": "节目期数", "value": "10", "suffix": "期"},
                {"label": "合作身份", "value": "云计算 AI", "suffix": "独家合作伙伴"},
                {"label": "主办", "value": "央视×杭州", "suffix": "政府"},
            ],
            "links": [
                {"label": "节目品牌主张", "url": "https://www.bilibili.com/search?keyword=赢在AI%2B"},
            ],
            "tags": ["AI+", "纪实创投", "整合营销", "品牌传播", "央视"],
            "kv": f"{MEDIA}/winai_kv.png",
            "videos": [
                {"name": "《赢在 AI+》TVC", "src": f"{MEDIA}/winai_tvc.mp4"},
                {"name": "节目回顾视频", "src": f"{MEDIA}/winai_review.mp4"},
                {"name": "无人机表演", "src": f"{MEDIA}/winai_drone.mp4"},
            ],
            "metrics": {"exposureW": winai_exp_w},
            "mapData": None,
        },
    ],
    "services": [
        {"title": "内容策略与选题策划", "icon": "strategy",
         "desc": "基于品牌目标与受众洞察，搭建内容矩阵与选题库，定义叙事主线与爆款规律，让每一支内容都服务于品牌增长。",
         "tags": ["选题管理", "内容日历", "叙事框架"]},
        {"title": "AIGC 内容制作", "icon": "sparkles",
         "desc": "熟练运用通义万相 Wan 等大模型进行 AI 视频/图文创作，把控从创意到成片的质量与审美，放大内容生产力。",
         "tags": ["AI 视频", "图文生成", "视觉审美"]},
        {"title": "整合营销传播", "icon": "megaphone",
         "desc": "统筹官方平台、社媒矩阵与媒体资源，设计跨渠道传播事件，把技术品牌故事打透到目标人群。",
         "tags": ["跨渠道", "传播事件", "媒介策略"]},
        {"title": "短视频运营与分发", "icon": "play",
         "desc": "B 站首发验证、视频号主阵地运营，矩阵覆盖小红书、YouTube，建立可持续的内容分发与粉丝增长机制。",
         "tags": ["B站", "视频号", "粉丝增长"]},
        {"title": "数据复盘与效果优化", "icon": "chart",
         "desc": "以播放、互动、曝光等核心指标驱动迭代，用数据回答「什么内容有效、为什么有效、下一步怎么调」。",
         "tags": ["指标分析", "A/B 迭代", "效果归因"]},
        {"title": "品牌叙事与 IP 打造", "icon": "badge",
         "desc": "为技术品牌构建可识别的人格与口播资产，把产品能力沉淀为有记忆点的 IP，实现长期心智占领。",
         "tags": ["品牌人格", "IP 化", "口播资产"]},
    ],
    "about": {
        "bio": "我是谢智聪，一名品牌内容主编与 AI 科普 IP 主理人。过去几年，我专注于把阿里云的技术能力，转化为大众愿意看、看得懂、愿意转发的品牌内容——从一支支 AI 科普短视频，到米兰冬奥 AIGC 全球大赛、《赢在 AI+》这类国家级传播 campaign。我相信好的品牌内容，是技术与人之间的翻译器。",
        "experience": [
            {"period": "2023 — 至今", "title": "品牌内容主编 · 超级 AI 研究所 IP 主理人",
             "org": "阿里云（品牌部）",
             "desc": "主导 50+ 支 AI 科普短视频的选题、脚本与品牌植入；13 支主编主导的「硬核/产业向」内容构成账号专业压舱石。"},
            {"period": "2025 — 2026", "title": "项目内容负责人 · 米兰冬奥 AIGC 全球大赛",
             "org": "阿里云 × 国际奥委会 × 米兰-科尔蒂纳 2026 冬奥组委",
             "desc": "全球首个官方奥运粉丝 AIGC 互动项目的内容与制作落地；127 国参与、全球 11 亿+ 曝光，TOP100 作品入藏奥林匹克博物馆。"},
            {"period": "2025 — 2026", "title": "传播策划 · 《赢在 AI+》第一季",
             "org": "中央广播电视总台 × 杭州市人民政府",
             "desc": "阿里云作为云计算 AI 独家合作伙伴的传播落地，统筹 TVC、节目回顾、无人机表演等多物料的整合传播。"},
        ],
        "education": [
            {"period": "20XX — 20XX", "school": "（请补充院校）", "major": "（请补充专业）"},
        ],
        "skills": [
            {"name": "内容策划与脚本", "level": 95},
            {"name": "AIGC / 短视频制作", "level": 90},
            {"name": "品牌叙事与 IP 打造", "level": 92},
            {"name": "整合营销传播", "level": 88},
            {"name": "数据复盘与优化", "level": 85},
            {"name": "跨渠道运营", "level": 86},
        ],
    },
    "contact": {
        "email": "xie.zhicong@example.com",
        "note": "邮箱与社媒账号为占位示例，请替换为真实信息。",
        "socials": [
            {"label": "B 站", "handle": "超级 AI 研究所", "url": "https://search.bilibili.com/all?keyword=超级AI研究所"},
            {"label": "视频号", "handle": "超级 AI 研究所", "url": ""},
            {"label": "小红书", "handle": "超级 AI 研究所", "url": "https://www.xiaohongshu.com/search_result?keyword=超级AI研究所"},
            {"label": "YouTube", "handle": "超级 AI 研究所", "url": "https://www.youtube.com/results?search_query=阿里云"},
            {"label": "微信", "handle": "（请补充微信号）", "url": ""},
        ],
    },
}

# ============================================================
# 5) 写出 data/site-data.js
# ============================================================
out = f"{DATA}/site-data.js"
with open(out, "w", encoding="utf-8") as f:
    f.write("// 自动生成，请勿手工编辑；修改请用 build.py 或在此数据文件中调整。\n")
    f.write("window.SITE_DATA = ")
    f.write(json.dumps(SITE_DATA, ensure_ascii=False, indent=2))
    f.write(";\n")

print("✓ 已生成", out)
print("  项目数:", len(SITE_DATA["projects"]), "| 服务数:", len(SITE_DATA["services"]))
print("  AI Lab: 视频", len(videos), "支 / 主编", main_count, "支 / 播放", fmt(plays_total * 10000), "次")
print("  冬奥: 国家", winter_metrics["countries"], "/ 投稿", fmt(winter_metrics["submissions"]), "/ 地图国", map_data.get("totalCountries", "?"))
print("  赢在AI+: 曝光", winai_exp_w, "万")
