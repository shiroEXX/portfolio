/* assets/app.js — 数据驱动渲染引擎（飞书作品集站点）
 * 依赖：data/site-data.js (window.SITE_DATA)、Tailwind Play CDN
 * 设计基线：ui-ux-pro-max「Exaggerated Minimalism」+ frontend-design 克制原则
 */
(function () {
  "use strict";
  const D = window.SITE_DATA || {};
  const PAGE = document.body.dataset.page || "index";

  /* ---------- 工具 ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = (n) => {
    const v = Number(String(n).replace(/,/g, ""));
    return v >= 1e8
      ? (v / 1e8).toFixed(1) + "亿"
      : v >= 1e4
      ? (v / 1e4).toFixed(1) + "w"
      : String(n);
  };
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  /* ---------- 图标（lucide 风格内联 SVG，无 emoji） ---------- */
  const ICONS = {
    strategy: '<path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-5"/>',
    sparkles: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>',
    megaphone: '<path d="M3 11l14-6v14L3 13z"/><path d="M3 11v2a2 2 0 002 2h2"/><path d="M17 6a3 3 0 010 6"/>',
    play: '<polygon points="6 4 20 12 6 20 6 4"/>',
    chart: '<path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7"/><rect x="12" y="6" width="3" height="11"/><rect x="17" y="13" width="3" height="4"/>',
    badge: '<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4L10 14"/><path d="M19 13v6a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1h6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  };
  function icon(name, cls = "w-5 h-5") {
    const p = ICONS[name] || "";
    return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  }

  /* ---------- 导航 ---------- */
  const NAV = [
    { id: "index", label: "首页", href: "index.html" },
    { id: "portfolio", label: "作品集", href: "portfolio.html" },
  ];
  function renderNav() {
    const root = $("#site-nav");
    if (!root) return;
    const links = NAV.map(
      (n) =>
        `<a href="${n.href}" data-nav="${n.id}" class="nav-link px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
          n.id === PAGE
          ? "text-white bg-indigo-600"
          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
        }">${n.label}</a>`
    ).join("");
    root.innerHTML = `
      <nav class="fixed top-0 inset-x-0 z-50 transition-all duration-300" id="nav-bar">
        <div class="mx-auto max-w-6xl px-5">
          <div class="flex items-center h-16">
            <div class="flex items-center gap-1">${links}</div>
            <button class="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 ml-auto" id="nav-toggle" aria-label="菜单">${icon(
              "menu",
              "w-6 h-6"
            )}</button>
          </div>
        </div>
        <div class="md:hidden hidden border-t border-zinc-100 bg-white/95 backdrop-blur" id="nav-mobile">
          <div class="mx-auto max-w-6xl px-5 py-3 flex flex-col gap-1">${links}</div>
        </div>
      </nav>`;
    const bar = $("#nav-bar");
    const onScroll = () => {
      if (window.scrollY > 8) {
        bar.classList.add("bg-white/90", "backdrop-blur", "border-b", "border-zinc-100", "shadow-sm");
      } else {
        bar.classList.remove("bg-white/90", "backdrop-blur", "border-b", "border-zinc-100", "shadow-sm");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const toggle = $("#nav-toggle");
    const mobile = $("#nav-mobile");
    toggle.addEventListener("click", () => mobile.classList.toggle("hidden"));
    $$("#nav-mobile a").forEach((a) =>
      a.addEventListener("click", () => mobile.classList.add("hidden"))
    );
  }

  /* ---------- 页脚 ---------- */
  function renderFooter() {
    const root = $("#site-footer");
    if (!root) return;
    const socials = (D.contact && D.contact.socials ? D.contact.socials : [])
      .filter((s) => s.url)
      .map(
        (s) =>
          `<a href="${esc(s.url)}" target="_blank" rel="noopener" class="text-zinc-500 hover:text-zinc-900 transition-colors">${esc(
            s.label
          )}</a>`
      )
      .join('<span class="text-zinc-300">·</span>');
    root.innerHTML = `
      <footer class="border-t border-zinc-100 bg-zinc-50">
        <div class="mx-auto max-w-6xl px-5 pb-8 pt-8 text-xs text-zinc-400">
          ©谢智聪 · 个人作品集
        </div>
      </footer>`;
  }

  /* ---------- 通用区块 ---------- */
  function sectionHead(eyebrow, title, sub) {
    return `
      <div class="reveal mb-10 md:mb-14">
        <div class="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-indigo-600 mb-3">
          <span class="h-px w-6 bg-amber-500"></span>${esc(eyebrow)}
        </div>
        <h2 class="font-display text-3xl md:text-5xl font-bold tracking-tight text-zinc-900">${esc(
          title
        )}</h2>
        ${sub ? `<p class="mt-4 text-zinc-500 max-w-2xl text-base md:text-lg">${esc(sub)}</p>` : ""}
      </div>`;
  }

  /* ---------- 项目卡 ---------- */
  function projectCard(p) {
    const tags = (p.tags || [])
      .slice(0, 4)
      .map((t) => `<span class="text-xs px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">${esc(t)}</span>`)
      .join("");
    const results = (p.results || [])
      .slice(0, 3)
      .map(
        (r) =>
          `<div><div class="font-display text-2xl font-bold text-zinc-900">${fmt(
            r.value
          )}<span class="text-sm font-medium text-zinc-400 ml-0.5">${esc(r.suffix || "")}</span></div><div class="text-xs text-zinc-500 mt-0.5">${esc(
            r.label
          )}</div></div>`
      )
      .join("");
    return `
      <article class="reveal group project-card" data-id="${esc(p.id)}" data-tags="${esc(
      (p.tags || []).join(",")
    )}" style="--accent:${esc(p.accent || "#4f46e5")}">
        <button class="block w-full text-left focus:outline-none" data-open="${esc(p.id)}">
          <div class="relative overflow-hidden rounded-2xl bg-zinc-100 aspect-[16/10] mb-5">
            ${
              p.kv
                ? `<img src="${esc(p.kv)}" alt="${esc(p.name)}" loading="lazy" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.style.display='none'">`
                : `<div class="h-full w-full flex items-center justify-center text-zinc-300" style="background:linear-gradient(135deg,#f4f4f5,#e4e4e7)">${icon(
                    "layers",
                    "w-12 h-12"
                  )}</div>`
            }
            <span class="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full bg-white/90 text-zinc-700 backdrop-blur">${esc(
              p.tagline
            )}</span>
          </div>
          <h3 class="font-display text-xl font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">${esc(
            p.name
          )}</h3>
          <p class="mt-2 text-sm text-zinc-500 line-clamp-2">${esc(p.description)}</p>
          <div class="mt-4 flex flex-wrap gap-2">${tags}</div>
          <div class="mt-5 grid grid-cols-3 gap-3 border-t border-zinc-100 pt-4">${results}</div>
          <div class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">查看项目详情 ${icon(
            "arrow",
            "w-4 h-4"
          )}</div>
        </button>
      </article>`;
  }

  /* ---------- 项目详情弹窗 ---------- */
  // —— 全球地图（choropleth）懒加载与渲染 ——
  let _echartsPromise = null;
  function ensureECharts() {
    if (window.echarts) return Promise.resolve(window.echarts);
    if (_echartsPromise) return _echartsPromise;
    _echartsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "assets/echarts.min.js";
      s.async = true;
      s.onload = () => (window.echarts ? resolve(window.echarts) : reject(new Error("echarts load failed")));
      s.onerror = () => reject(new Error("echarts cdn error"));
      document.head.appendChild(s);
    });
    return _echartsPromise;
  }

  let _worldGeoPromise = null;
  function loadWorldGeo() {
    if (window.__worldGeo) return Promise.resolve(window.__worldGeo);
    if (_worldGeoPromise) return _worldGeoPromise;
    _worldGeoPromise = ensureECharts()
      .then(() =>
        fetch("assets/world.geo.json")
          .then((r) => r.json())
          .then((geo) => {
            // Natural Earth 对法国等少数国家 ISO_A2 记为 -99，做修正以保证染色
            (geo.features || []).forEach((f) => {
              const p = f.properties || {};
              if (p.NAME === "France" && p.ISO_A2 === "-99") p.ISO_A2 = "FR";
            });
            try { window.echarts.registerMap("world", geo); } catch (e) {}
            window.__worldGeo = geo;
            return geo;
          })
      );
    return _worldGeoPromise;
  }

  function renderWinterMap(p) {
    const el = document.getElementById("winter-map");
    if (!el) return;
    loadWorldGeo()
      .then(() => {
        const chart = window.echarts.init(el);
        window.__winterChart = chart;
        const data = Object.entries(p.mapData.countries).map(([code, c]) => ({ name: code, value: c.count }));
        chart.setOption({
          tooltip: { show: false },
          visualMap: {
            show: false,
            min: 1,
            max: p.mapData.maxCount || 13,
            inRange: { color: ["#ecfdf5", "#a7f3d0", "#34d399", "#059669", "#047857"] },
          },
          series: [
            {
              type: "map",
              map: "world",
              nameProperty: "ISO_A2",
              roam: false,
              label: { show: false },
              itemStyle: { areaColor: "#f1f5f9", borderColor: "#e2e8f0", borderWidth: 0.5 },
              emphasis: { itemStyle: { areaColor: "#fde68a" }, label: { show: false } },
              data: data,
            },
          ],
        });
        const onResize = () => chart.resize();
        window.__winterResize = onResize;
        window.addEventListener("resize", onResize);
      })
      .catch(() => {
        const m = document.getElementById("winter-map");
        if (m) m.style.display = "none";
      });
  }

  function openProject(p) {
    const root = $("#modal-root");
    const links = (p.links || [])
      .map(
        (l) =>
          `<a href="${esc(l.url)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-full border border-zinc-200 text-zinc-700 hover:border-zinc-900 hover:text-zinc-900 transition-colors ${
            l.url ? "" : "pointer-events-none opacity-50"
          }">${esc(l.label)} ${icon("external", "w-3.5 h-3.5")}</a>`
      )
      .join("");
    const tags = (p.tags || [])
      .map((t) => `<span class="text-xs px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">${esc(t)}</span>`)
      .join("");
    const results = (p.results || [])
      .map(
        (r) =>
          `<div class="rounded-xl bg-zinc-50 border border-zinc-100 p-4"><div class="font-display text-2xl font-bold text-zinc-900">${fmt(
            r.value
          )}<span class="text-sm text-zinc-400 ml-0.5">${esc(r.suffix || "")}</span></div><div class="text-xs text-zinc-500 mt-1">${esc(
            r.label
          )}</div></div>`
      )
      .join("");

    let media = "";
    if (p.id === "ai-lab") {
      const grid = (p.featured && p.featured.length ? p.featured : p.videos || [])
        .map(
          (v) => `
          <a href="${esc(v.url)}" target="_blank" rel="noopener" class="group block">
            <div class="relative aspect-video rounded-xl overflow-hidden bg-zinc-100">
              ${v.cover ? `<img src="${esc(v.cover)}" alt="${esc(v.title)}" loading="lazy" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.style.display='none'">` : ""}
              <span class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/30 text-white">${icon("play","w-8 h-8")}</span>
            </div>
            <div class="mt-2 text-sm text-zinc-700 line-clamp-1 group-hover:text-indigo-600">${esc(v.title)}</div>
            <div class="text-xs text-zinc-400">${fmt(v.plays)} 播放 · ${fmt(v.interactions)} 互动</div>
          </a>`
        )
        .join("");
      media = `<div class="mt-6"><div class="text-sm font-semibold text-zinc-700 mb-3">主编主导视频（${(
        p.featured || []
      ).length}）</div><div class="grid grid-cols-2 sm:grid-cols-3 gap-4">${grid}</div></div>`;
    } else if (p.videos && p.videos.length) {
      const vids = p.videos
        .map(
          (v) => `
          <figure class="rounded-xl overflow-hidden bg-black">
            <video class="w-full max-h-[320px]" controls preload="metadata" src="${esc(v.src)}"></video>
            <figcaption class="text-xs text-zinc-400 px-3 py-2 bg-zinc-900 text-white">${esc(v.name)}</figcaption>
          </figure>`
        )
        .join("");
      media = `<div class="mt-6 grid gap-4 sm:grid-cols-2">${vids}</div>`;
    }

    let reach = "";
    if (p.mapData && p.mapData.countries) {
      reach = `
        <div class="mt-6 rounded-2xl border border-zinc-100 bg-emerald-50/40 p-5">
          <div class="flex items-center gap-2 text-emerald-700 font-semibold"><span>${icon(
            "globe",
            "w-5 h-5"
          )}</span> 全球创作者参与</div>
          <div id="winter-map" class="mt-3 w-full" style="height:384px"></div>
        </div>`;
    }

    root.innerHTML = `
      <div class="fixed inset-0 z-[60] flex items-start justify-center p-4 sm:p-8 overflow-y-auto" id="modal-overlay">
        <div class="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm" data-close></div>
        <div class="relative z-10 w-full max-w-3xl bg-white rounded-3xl shadow-2xl my-8 overflow-hidden" role="dialog" aria-modal="true">
          <div class="h-1.5 w-full" style="background:${esc(p.accent || "#4f46e5")}"></div>
          <button class="absolute top-4 right-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200" data-close aria-label="关闭">${icon(
            "close",
            "w-5 h-5"
          )}</button>
          <div class="p-6 sm:p-8">
            <div class="text-xs font-semibold tracking-widest uppercase mb-2" style="color:${esc(
              p.accent || "#4f46e5"
            )}">${esc(p.tagline)}</div>
            <h3 class="font-display text-2xl sm:text-3xl font-bold text-zinc-900">${esc(p.name)}</h3>
            <p class="mt-1 text-sm text-zinc-500">${esc(p.role)}</p>
            <p class="mt-4 text-zinc-600 leading-relaxed">${esc(p.description)}</p>
            <div class="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">${results}</div>
            <div class="mt-5 flex flex-wrap gap-2">${tags}</div>
            ${media}
            ${reach}
            <div class="mt-6 flex flex-wrap gap-2">${links}</div>
          </div>
        </div>
      </div>`;
    if (p.id === "winter" && p.mapData && p.mapData.countries) renderWinterMap(p);
    const close = () => {
      if (window.__winterChart) {
        try { window.__winterChart.dispose(); } catch (e) {}
        window.__winterChart = null;
      }
      if (window.__winterResize) {
        window.removeEventListener("resize", window.__winterResize);
        window.__winterResize = null;
      }
      root.innerHTML = "";
      document.body.style.overflow = "";
    };
    $$("#modal-overlay [data-close]").forEach((b) => b.addEventListener("click", close));
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", esc);
      }
    });
    document.body.style.overflow = "hidden";
  }

  function bindProjectOpen() {
    $$("[data-open]").forEach((b) =>
      b.addEventListener("click", () => {
        const p = (D.projects || []).find((x) => x.id === b.dataset.open);
        if (p) openProject(p);
      })
    );
  }

  /* ---------- 首页 ---------- */
  function renderIndex() {
    const root = $("#page-content");
    if (!root) return;
    const p = D.profile || {};
    const projects = D.projects || [];
    root.innerHTML = `
      <header class="relative pt-28 md:pt-36 pb-12 md:pb-16 overflow-hidden">
        <div class="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-100 blur-3xl opacity-60"></div>
        <div class="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-zinc-200 blur-3xl opacity-50"></div>
        <div class="relative mx-auto max-w-6xl px-5">
          <div class="reveal inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-indigo-600 mb-5">
            <span class="h-px w-8 bg-amber-500"></span>个人作品集 · Portfolio
          </div>
          <h1 class="reveal font-display font-bold tracking-tight text-zinc-900 text-5xl sm:text-6xl md:text-7xl leading-[1.05]">
            ${esc(p.name || "谢智聪")}
          </h1>
          <p class="reveal mt-6 max-w-2xl text-base md:text-lg text-zinc-600 leading-relaxed">${esc(
            p.bio || p.tagline || ""
          )}</p>
          <div class="reveal mt-8 flex flex-wrap gap-3">
            <a href="portfolio.html" class="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">查看作品集 ${icon(
              "arrow",
              "w-4 h-4"
            )}</a>
          </div>
        </div>
      </header>

      <section class="py-14 md:py-20">
        <div class="mx-auto max-w-6xl px-5">
          ${sectionHead("", "部分过往项目", "")}
          <div class="grid md:grid-cols-3 gap-6">${projects.map(projectCard).join("")}</div>
        </div>
      </section>`;
    bindProjectOpen();
  }

  /* ---------- 作品集 ---------- */
  function renderPortfolio() {
    const root = $("#page-content");
    if (!root) return;
    const projects = D.projects || [];
    root.innerHTML = `
      <section class="pt-28 md:pt-36 pb-12">
        <div class="mx-auto max-w-6xl px-5">
          ${sectionHead("作品集", "项目案例", "点击任意项目卡片，查看完整成果、媒体与传播数据。")}
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6" id="project-grid">${projects
            .map(projectCard)
            .join("")}</div>
        </div>
      </section>`;
    bindProjectOpen();
  }

  /* ---------- 服务技能 ---------- */
  function renderServices() {
    const root = $("#page-content");
    if (!root) return;
    const services = D.services || [];
    root.innerHTML = `
      <section class="pt-28 md:pt-36 pb-16">
        <div class="mx-auto max-w-6xl px-5">
          ${sectionHead("服务技能", "核心能力", "从选题到传播、从制作到复盘，覆盖品牌内容建设的全链路。")}
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            ${services
              .map(
                (s, i) => `
              <div class="reveal rounded-2xl border border-zinc-100 bg-white p-6 hover:shadow-lg transition-shadow group">
                <div class="flex items-center justify-between">
                  <div class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">${icon(
                    s.icon
                  )}</div>
                  <span class="font-display text-sm text-zinc-300">0${i + 1}</span>
                </div>
                <h3 class="mt-4 font-display font-bold text-zinc-900">${esc(s.title)}</h3>
                <p class="mt-2 text-sm text-zinc-500 leading-relaxed">${esc(s.desc)}</p>
                <div class="mt-4 flex flex-wrap gap-2">${(s.tags || [])
                  .map((t) => `<span class="text-xs px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-500">${esc(t)}</span>`)
                  .join("")}</div>
              </div>`
              )
              .join("")}
          </div>
        </div>
      </section>`;
  }

  /* ---------- 关于我 ---------- */
  function renderAbout() {
    const root = $("#page-content");
    if (!root) return;
    const a = D.about || {};
    const exp = (a.experience || [])
      .map(
        (e, i) => `
        <div class="reveal relative pl-8 pb-8 border-l border-zinc-200 last:border-0">
          <span class="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-indigo-600 ring-4 ring-indigo-50"></span>
          <div class="text-xs font-semibold text-indigo-600">${esc(e.period || "")}</div>
          <h3 class="mt-1 font-display font-bold text-zinc-900">${esc(e.title || "")}</h3>
          <div class="text-sm text-zinc-500">${esc(e.org || "")}</div>
          <p class="mt-2 text-sm text-zinc-600 leading-relaxed">${esc(e.desc || "")}</p>
        </div>`
      )
      .join("");
    const skills = (a.skills || [])
      .map(
        (s) => `
        <div class="reveal">
          <div class="flex items-center justify-between text-sm mb-1.5"><span class="font-medium text-zinc-700">${esc(
            s.name
          )}</span><span class="text-zinc-400">${s.level}%</span></div>
          <div class="h-2 rounded-full bg-zinc-100 overflow-hidden"><div class="h-full rounded-full bg-zinc-900" style="width:${s.level}%"></div></div>
        </div>`
      )
      .join("");
    const edu = (a.education || [])
      .map(
        (e) => `
        <div class="reveal flex items-start gap-3 py-3 border-b border-zinc-100 last:border-0">
          <span class="text-xs font-semibold text-indigo-600 whitespace-nowrap">${esc(e.period || "")}</span>
          <div><div class="font-medium text-zinc-800">${esc(e.school || "")}</div><div class="text-sm text-zinc-500">${esc(
            e.major || ""
          )}</div></div>
        </div>`
      )
      .join("");
    root.innerHTML = `
      <section class="pt-28 md:pt-36 pb-16">
        <div class="mx-auto max-w-4xl px-5">
          ${sectionHead("关于我", "用内容连接技术与大众", "")}
          <p class="reveal text-lg text-zinc-600 leading-relaxed">${esc(a.bio || "")}</p>
        </div>
        <div class="mx-auto max-w-6xl px-5 mt-14 grid lg:grid-cols-3 gap-10">
          <div class="lg:col-span-2">
            <h3 class="reveal font-display font-bold text-xl text-zinc-900 mb-6">职业经历</h3>
            ${exp}
          </div>
          <div>
            <h3 class="reveal font-display font-bold text-xl text-zinc-900 mb-6">核心能力</h3>
            <div class="space-y-5">${skills}</div>
            <h3 class="reveal font-display font-bold text-xl text-zinc-900 mt-10 mb-2">教育背景</h3>
            ${edu}
          </div>
        </div>
      </section>`;
  }

  /* ---------- 联系我 ---------- */
  function renderContact() {
    const root = $("#page-content");
    if (!root) return;
    const c = D.contact || {};
    const socials = (c.socials || [])
      .map(
        (s) => `
        <a href="${esc(s.url || "#")}" target="_blank" rel="noopener" class="reveal flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-5 py-4 hover:border-zinc-300 hover:shadow-sm transition-all ${
          s.url ? "" : "pointer-events-none opacity-60"
        }">
          <span class="font-medium text-zinc-800">${esc(s.label)}</span>
          <span class="text-sm text-zinc-400">${esc(s.handle || "")} ${s.url ? icon("external", "w-4 h-4") : ""}</span>
        </a>`
      )
      .join("");
    root.innerHTML = `
      <section class="pt-28 md:pt-36 pb-16">
        <div class="mx-auto max-w-3xl px-5 text-center">
          ${sectionHead("联系我", "一起把技术讲成好故事", "无论是品牌内容合作、AIGC 制作还是整合营销传播，欢迎随时联系。")}
          <a href="mailto:${esc(c.email || "")}" class="reveal inline-flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">${icon(
            "mail",
            "w-5 h-5"
          )} ${esc(c.email || "email")}</a>
          ${
            c.note
              ? `<p class="reveal mt-3 text-xs text-zinc-400">${esc(c.note)}</p>`
              : ""
          }
        </div>
        <div class="mx-auto max-w-2xl px-5 mt-12 grid sm:grid-cols-2 gap-3">${socials}</div>
      </section>`;
  }

  /* ---------- 入场动画（尊重 reduced-motion） ---------- */
  function initReveal() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const items = $$(".reveal");
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((i) => i.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    items.forEach((i) => io.observe(i));
  }

  /* ---------- 启动 ---------- */
  function init() {
    renderNav();
    renderFooter();
    if (PAGE === "index") renderIndex();
    else if (PAGE === "portfolio") renderPortfolio();
    else if (PAGE === "services") renderServices();
    else if (PAGE === "about") renderAbout();
    else if (PAGE === "contact") renderContact();
    initReveal();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
