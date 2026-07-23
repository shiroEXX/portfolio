/* ===================================================
   主脚本 — 选项卡切换 / 视频渲染 / 地图 / 千分符
   =================================================== */

const D = window.SITE_DATA;
const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

/* ===== 工具函数 ===== */
function fmt(n) {
  if (n === null || n === undefined || n === '') return '-';
  const num = Number(String(n).replace(/,/g, ''));
  if (isNaN(num)) return n;
  return num.toLocaleString('zh-CN');
}
function esc(str) { return String(str || '').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function nl2br(str) { return esc(str).replace(/\n/g,'<br>'); }

/* ===== 主题色配置 ===== */
const THEMES = {
  'ai-lab':     { accent: '#2563eb', light: '#eff6ff', glow: 'rgba(37,99,235,.12)' },
  'winter-aigc': { accent: '#059669', light: '#ecfdf5', glow: 'rgba(5,150,105,.12)' },
  'winai':      { accent: '#dc2626', light: '#fef2f2', glow: 'rgba(220,38,38,.12)' }
};

function setTheme(tabId) {
  const t = THEMES[tabId] || THEMES['ai-lab'];
  document.documentElement.style.setProperty('--accent', t.accent);
  document.documentElement.style.setProperty('--accent-light', t.light);
  document.documentElement.style.setProperty('--accent-glow', t.glow);
}

/* ===== 选项卡切换 ===== */
const tabsNav = $('#tabsNav');
const panels = $$('.tab-panel');
const tabs = $$('.tab');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.dataset.tab;

    // 切换 tab 状态
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // 切换面板
    panels.forEach(p => p.classList.remove('active'));
    const panel = $(`#panel-${targetId}`);
    if (panel) panel.classList.add('active');

    // 切换主题色
    setTheme(targetId);

    // 滚动到内容区顶部
    const contentArea = $('#contentArea');
    if (contentArea) {
      contentArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// 初始化默认主题
setTheme('ai-lab');

/* ===== 渲染：超级AI研究所视频网格 ===== */
(function renderVideoGrid() {
  const grid = $('#videoGrid');
  if (!grid || !D.allVideos) return;

  const all = D.allVideos;
  const featuredBvids = new Set((D.featuredVideos || []).map(v => v.bvid));

  // 排序：主编视频优先，已发布其次
  const ordered = [
    ...all.filter(v => featuredBvids.has(v.bvid)),
    ...all.filter(v => !featuredBvids.has(v.bvid) && v.status === '已发布')
  ];

  ordered.forEach((v, i) => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.style.animationDelay = (i % 10) * .04 + 's';

    const hasCover = v.cover && v.cover !== '';
    const bilibiliUrl = v.bvid ? `https://www.bilibili.com/video/${v.bvid}` : '#';

    card.innerHTML = `
      <div class="thumb-wrap">
        ${hasCover ? `<img class="thumb" src="${esc(v.cover)}" alt="${esc(v.title)}" loading="lazy" />` : ''}
        <div class="play-overlay">
          <div class="play-icon"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
        </div>
      </div>
      <div class="meta">
        <h3>${esc(v.title)}${v.isEditor ? '<span class="editor-badge">主编</span>' : ''}</h3>
        <div class="stats">
          <span>▶ ${fmt(v.playW)}万</span>
          <span>♥ ${fmt(v.redHeart || v.like)}</span>
          <span>💬 ${fmt(v.comment)}</span>
        </div>
      </div>
    `;

    // 点击封面或卡片 → 跳转B站（新窗口）
    card.addEventListener('click', () => {
      if (featuredBvids.has(v.bvid)) {
        openModal(v.bvid);  // 主编视频弹详情
      } else {
        window.open(bilibiliUrl, '_blank');  // 非主编视频直接跳B站
      }
    });

    grid.appendChild(card);
  });
})();

/* ===== 渲染：冬奥AIGC数据指标 ===== */
(function renderWinterMetrics() {
  const container = $('#winterMetrics');
  if (!container) return;

  const winter = D.winterMetrics || {};
  const items = [
    { label: '参赛国家/地区', value: winter.countries || '127', suffix: '个' },
    { label: '投稿作品数量', value: '1.5万+', suffix: '' },
    { label: '国内曝光量', value: fmt(winter.domesticExposure), suffix: '' },
    { label: '国际曝光量', value: fmt(winter.intlExposure), suffix: '' },
    { label: '全网互动量', value: fmt(winter.interactions), suffix: '' },
  ];

  container.innerHTML = items.map(m => `
    <div class="metric-card">
      <div class="metric-val">${m.value}<small style="font-size:.5em;font-weight:500;opacity:.6">${m.suffix}</small></div>
      <div class="metric-lbl">${m.label}</div>
    </div>
  `).join('');
})();

/* ===== 渲染：赢在AI+数据 ===== */
(function renderWinAIMetric() {
  const container = $('#winaiMetric');
  if (!container) return;

  container.innerHTML = `
    <div class="big-metric">
      <div class="metric-val">${fmt(D.winAIExposure || 32268)}<small style="font-size:.38em;font-weight:500;opacity:.6">万+</small></div>
      <div class="metric-lbl">全网视频曝光总量</div>
    </div>
  `;
})();

/* ===== 全球地图渲染 ===== */
(function renderWorldMap() {
  const svg = $('#worldMap');
  const tooltip = $('#mapTooltip');
  const legendEl = $('#mapLegend');
  const countEl = $('#mapCountryCount');
  if (!svg) return;

  const mapData = D.mapData || {};
  const countries = mapData.countries || {};
  const totalCountries = mapData.totalCountries || Object.keys(countries).length;

  if (countEl) countEl.textContent = `(共 ${totalCountries} 个国家/地区)`;

  // 极简世界地图路径数据（主要国家，按ISO alpha-2代码索引）
  // 这是一个简化版地图，覆盖主要国家轮廓
  const PATHS = {
    "CN":"M685 228 L690 225 L695 226 L700 230 L702 238 L700 245 L694 250 L686 248 L680 240 Z",
    "US":"M142 145 L155 140 L170 138 L185 142 L195 150 L198 162 L194 175 L182 184 L165 186 L148 180 L135 168 L136 155 Z",
    "RU":"M520 95 L560 92 L600 98 L640 108 L680 120 L720 135 L750 155 L760 175 L755 195 L735 210 L700 218 L660 222 L620 220 L580 212 L545 198 L520 178 L508 158 L512 135 L520 115 Z",
    "BR":"M255 320 L275 315 L295 318 L310 330 L315 350 L308 370 L288 380 L265 378 L248 365 L245 345 Z",
    "IN":"M605 258 L618 255 L630 260 L638 272 L636 286 L625 294 L610 292 M598 280 L605 270Z",
    "AU":"M735 360 L758 355 L778 362 L788 378 L782 395 L764 402 L742 396 L732 380 Z",
    "CA":"M132 100 L160 94 L190 96 L215 106 L228 122 L226 140 L210 154 L182 160 L152 156 L128 144 L120 122 Z",
    "MX":"M130 200 L150 196 L168 202 L178 216 L174 232 L158 240 L138 236 L126 222 Z",
    "ID":"M688 318 L708 312 L725 320 L732 336 L726 352 L708 356 L690 348 Z",
    "JP":"M780 172 L792 168 L800 176 L798 188 L786 192 L776 184 Z",
    "GB":"M420 145 L432 142 L440 148 L438 158 L426 162 L418 155 Z",
    "DE":"M468 148 L482 146 L492 152 L490 164 L476 168 L466 160 Z",
    "FR":"M430 160 L448 156 L462 163 L465 177 L454 189 L436 186 L426 174 Z",
    "IT":"M468 185 L480 182 L490 190 L486 204 L472 208 L462 198 Z",
    "ES":"M408 178 L426 174 L438 183 L434 198 L418 202 L406 192 Z",
    "PH":"M718 278 L732 274 L742 284 L738 298 L724 300 L712 290 Z",
    "VN":"M655 286 L668 282 L678 292 L674 306 L660 308 L650 298 Z",
    "TH":"M648 296 L662 292 L672 302 L668 316 L654 318 L644 308 Z",
    "MY":"M638 304 L656 300 L668 312 L662 328 L644 332 L630 322 Z",
    "NG":"M438 288 L456 284 L468 294 L464 310 L446 314 L432 304 Z",
    "PK":"M585 242 L598 238 L608 248 L604 264 L588 268 L576 256 Z",
    "BD":"M638 262 L648 258 L656 266 L652 278 L640 280 L632 272 Z",
    "EG":"M500 248 L516 244 L526 254 L522 268 L506 272 L494 262 Z",
    "AR":"M252 340 L272 336 L288 346 L284 366 L264 372 L248 360 Z",
    "ZA":"M500 380 L520 376 L535 386 L530 402 L510 406 L494 396 Z",
    "TR":"M500 180 L516 176 L526 186 L522 200 L506 204 L494 194 Z",
    "IR":"M540 200 L560 196 L572 206 L568 222 L548 226 M536 214 L544 206Z",
    "SA":"M520 248 L536 244 L546 254 L542 268 L526 272 M514 260 L522 252Z",
    "UA":"M530 150 L555 146 L575 154 L572 172 L550 178 L528 168 Z",
    "PL":"M480 148 L496 144 L506 154 L502 168 L484 172 M472 162 L480 154Z",
    "KR":"M768 192 L780 188 L788 198 L782 210 L768 212 L758 202 Z",
    "NL":"M448 143 L458 141 L464 147 L462 156 L452 158 L444 151 Z",
    "SE":"M478 118 L492 114 L502 124 L498 138 L484 142 M472 132 L480 124Z",
    "NO":"M458 95 L474 91 L484 102 L478 116 L462 120 M450 110 L458 100Z",
    "CH":"M456 166 L466 164 L472 170 L468 180 L458 182 L452 174 Z",
    "AT":"M476 164 L488 162 L494 170 L490 180 L478 182 M470 174 L476 168Z",
    "BE":"M440 155 L450 153 L456 159 L454 168 L444 170 L438 163 Z",
    "CZ":"M476 154 L490 152 L498 160 L494 172 L480 174 M468 166 L476 158Z",
    "PT":"M400 186 L412 184 L420 192 L416 204 L404 206 L396 198 Z",
    "GR":"M488 192 L502 188 L510 198 L506 212 L492 214 M480 204 L488 196Z",
    "RO":"M512 168 L530 164 L542 174 L538 190 L518 194 M506 184 L516 174Z",
    "IL":"M524 220 L534 218 L540 226 L536 236 L524 238 M516 230 L524 222Z",
    "HU":"M496 164 L508 162 L514 170 L510 180 M498 176 L496 168Z",
    "DK":"M456 133 L466 131 L472 137 L468 146 L458 148 L452 141 Z",
    "FI":"M508 98 L524 94 L534 104 L528 118 L512 122 M500 112 L508 102Z",
    "IE":"M408 145 L420 143 L426 149 L422 158 L412 160 L404 153 Z",
    "AT":"M474 162 L486 160 L492 168 L488 178 M476 174 L474 166Z",
    "CL":"M218 360 L234 356 L244 366 L240 382 L224 386 M212 376 L220 366Z",
    "PE":"M208 332 L226 328 L240 338 L236 354 L218 358 M206 348 L216 338Z",
    "CO":"M232 268 L250 264 L264 274 L260 290 L242 294 M230 284 L240 274Z",
    "VE":"M228 236 L244 232 L256 242 L252 258 L236 262 M224 252 L234 242Z",
    "MA":"M400 210 L418 206 L430 216 L426 232 L408 236 M396 226 L408 216Z",
    "DZ":"M452 208 L468 204 L478 214 L474 230 L458 234 M446 224 M456 214Z",
    "KE":"M528 298 L544 294 L554 304 L550 320 L534 324 M522 314 L532 304Z",
    "ET":"M532 288 L548 284 L558 294 L554 310 M542 300 L536 292Z",
    "TZ":"M528 340 L544 336 L554 346 L550 362 M540 352 L532 344Z",
    "GH":"M432 286 L446 282 L456 292 L452 306 M442 296 L434 290Z",
    "CI":"M428 304 L442 300 L452 310 L448 324 M438 314 L430 308Z",
    "CM":"M470 278 L486 274 L496 284 L492 300 M482 290 L474 282Z",
    "SN":"M408 276 L424 272 L434 282 L430 296 M420 286 M412 280Z",
    "SN":"M408 276 L424 272 L434 282 L430 296 M420 286 M412 280Z",
    "UG":"M536 292 L548 288 L556 298 L552 312 M544 302 L538 294Z",
    "ZW":"M532 368 L548 364 L558 374 L554 390 M544 380 L536 372Z",
    "AO":"M470 328 L486 324 L496 334 L492 350 M482 340 M474 332Z",
    "MZ":"M518 352 L534 348 L544 358 L540 374 M530 364 M520 356Z",
    "ZM":"M524 368 L540 364 L550 374 M542 364 M528 372Z",
    "MW":"M518 344 L532 340 L540 350 M534 348 M520 352Z",
    "NA":"M470 352 L486 348 L496 358 L492 374 M482 364 M472 356Z",
    "BW":"M498 358 L512 354 L522 364 L518 380 M512 368 M502 360Z",
    "LY":"M478 228 L492 224 L502 234 L498 248 M490 238 M480 230Z",
    "TN":"M448 208 L460 204 L468 214 L464 226 M456 216 M450 210Z",
    "IQ":"M548 222 L562 218 L572 228 L568 244 M556 234 M550 226Z",
    "SY":"M532 206 L544 202 L552 212 L548 226 M540 216 M534 208Z",
    "AF":"M568 228 L582 224 L592 234 L588 250 M576 240 M570 232Z",
    "PK":"M582 242 L596 238 L606 248 L602 264 M590 254 M584 246Z",
    "NP":"M616 252 L626 248 L632 256 L628 268 M622 260 M618 254Z",
    "LK":"M638 278 L648 274 L654 282 L650 294 M644 284 M640 278Z",
    "MM":"M648 296 L664 292 L676 302 L672 318 M656 308 M650 300Z",
    "KH":"M672 296 L686 292 L696 302 L692 316 M680 306 M674 298Z",
    "LA":"M662 292 L676 288 L686 298 L682 312 M670 302 M664 294Z",
    "BN":"M698 300 L708 296 L714 304 L710 314 M704 306 M700 300Z",
    "SG":"M672 314 L680 312 L684 318 L680 324 M676 320 M672 316Z",
    "TW":"M748 242 L758 238 L764 246 L760 256 M754 248 M750 244Z",
    "HK":"M708 270 L716 268 L720 274 L716 280 M712 276 M708 272Z",
    "MO":"M700 268 L708 266 L712 272 M708 274 M702 270Z",
    "BY":"M540 158 L556 154 L566 164 L562 180 M548 170 M542 162Z",
    "SK":"M498 156 L510 152 L518 162 L514 174 M506 164 M500 158Z",
    "HR":"M478 176 L490 172 L498 182 L494 194 M486 184 M480 178Z",
    "SI":"M472 172 L482 168 L488 176 L484 186 M478 178 M474 173Z",
    "BA":"M492 172 L502 168 L508 176 L504 186 M496 178 M494 174Z",
    "AL":"M484 182 L494 178 L500 188 L496 200 M490 190 M486 184Z",
    "MK":"M496 178 L506 174 L512 182 L508 192 M500 184 M498 180Z",
    "BG":"M516 174 L530 170 L540 180 L536 196 M524 186 M518 178Z",
    "MD":"M528 168 L540 164 L548 174 M540 174 M530 170Z",
    "GE":"M548 186 L560 182 L566 190 L562 202 M554 192 M550 188Z",
    "AM":"M558 182 L568 178 L574 186 M566 184 M560 182Z",
    "AZ":"M568 192 L580 188 L586 196 M578 196 M570 194Z",
    "KZ":"M580 158 L608 154 L632 162 L640 178 L628 194 L600 198 L572 190 M580 174 Z",
    "UZ":"M568 186 L596 182 L616 190 L612 206 M592 198 M572 190Z",
    "TM":"M560 200 L576 196 L584 204 M576 204 M562 202Z",
    "MN":"M620 148 L656 144 L680 152 L688 168 L672 184 L640 188 L608 182 M624 166 Z",
    "JO":"M532 224 L544 220 L550 228 M542 228 M534 226Z",
    "LB":"M524 216 L534 212 L538 220 M532 218 M526 216Z",
    "CY":"M516 208 L526 204 L530 212 M524 210 M518 208Z",
    "EC":"M224 328 L236 324 L244 332 M236 330 M226 328Z",
    "BO":"M242 328 L258 324 L268 334 M260 332 M244 330Z",
    "PY":"M262 358 L276 354 L284 362 M276 360 M264 358Z",
    "UY":"M262 378 L274 374 L280 382 M274 380 M264 378Z",
    "GY":"M278 322 L290 318 L296 326 M288 324 M280 322Z",
    "SR":"M278 312 L290 308 L296 316 M288 314 M280 312Z",
    "GF":"M280 292 L290 288 L296 296 M288 294 M282 292Z",
    "JM":"M238 244 L248 240 L254 248 M246 246 M240 244Z",
    "HT":"M236 256 L246 252 L252 260 M244 258 M238 256Z",
    "DO":"M242 258 L252 254 L258 262 M250 260 M244 258Z",
    "PR":"M238 268 L246 264 L250 272 M244 270 M240 268Z",
    "CU":"M208 244 L220 240 L228 248 M222 246 M210 244Z",
    "HT":"M236 256 L246 252 L252 260 M244 258 M238 256Z",
    "NI":"M218 278 L230 274 L238 282 M230 280 M220 278Z",
    "SV":"M212 274 L222 270 L228 278 M222 276 M214 274Z",
    "GT":"M208 264 L220 260 L228 268 M222 266 M210 264Z",
    "BZ":"M222 294 L232 290 L238 298 M232 296 M224 294Z",
    "HN":"M218 278 L230 274 L238 282 M230 280 M220 278Z",
    "PA":"M212 284 L222 280 L228 288 M222 286 M214 284Z",
    "CR":"M208 286 L218 282 L224 290 M218 288 M210 286Z",
    "GQ":"M446 316 L456 312 L462 320 M456 318 M448 316Z",
    "GA":"M454 316 L464 312 L470 320 M464 318 M456 316Z",
    "CG":"M470 316 L484 312 L492 320 M484 318 M472 316Z",
    "CD":"M498 316 L524 312 L540 324 L532 348 M516 340 M504 322Z",
    "CF":"M486 304 L500 300 L508 308 M500 306 M488 304Z",
    "TD":"M478 272 L490 268 L496 276 M490 274 M480 272Z",
    "NE":"M448 258 L462 254 L472 264 M464 262 M450 260Z",
    "ML":"M418 248 L436 244 L448 254 M440 252 M420 250Z",
    "BF":"M448 278 L462 274 L472 284 M464 282 M450 280Z",
    "BJ":"M448 296 L460 292 L466 300 M458 298 M450 296Z",
    "TG":"M438 296 L448 292 L454 300 M446 298 M440 296Z",
    "RW":"M536 316 L546 312 L552 320 M546 318 M538 316Z",
    "BI":"M536 308 L546 304 L552 312 M546 310 M538 308Z",
    "SS":"M532 316 L544 312 L550 320 M544 318 M534 316Z",
    "ER":"M544 284 L554 280 L560 288 M554 286 M546 284Z",
    "DJ":"M548 280 L556 276 L560 284 M554 282 M548 280Z",
    "SO":"M548 296 L568 292 L580 302 M568 302 M552 298Z",
    "SD":"M536 268 L552 264 L562 274 M554 272 M538 270Z",
    "LR":"M418 296 L428 292 L434 300 M426 298 M420 296Z",
    "SL":"M418 288 L428 284 L434 292 M426 290 M420 288Z",
    "GN":"M416 276 L426 272 L432 280 M426 278 M418 276Z",
    "GW":"M408 278 L416 274 L420 282 M414 280 M410 278Z",
    "SN":"M408 276 L424 272 L434 282 L430 296 M420 286 M412 280Z",
    "MR":"M416 252 L436 248 L448 258 M438 256 M420 254Z",
    "MG":"M548 352 L568 348 L580 358 L572 378 M556 368 M546 354Z",
    "MU":"M588 376 L598 372 L604 380 M598 378 M590 376Z",
    "NZ":"M815 390 L832 386 L842 396 L836 410 L820 412 Z",
    "FJ":"M865 380 L878 376 L886 384 L880 394 L868 396 Z",
    "IS":"M438 72 L454 68 L464 78 L458 92 L444 96 M434 86 L440 74Z",
    "LU":"M450 157 L458 155 L462 161 L460 168 L452 170 L446 164 Z",
    "EE":"M516 120 L528 116 L536 126 L530 140 M520 130 M518 122Z",
    "LV":"M508 134 L522 130 L530 140 M522 138 M510 136Z",
    "LT":"M508 148 L524 144 L534 154 M526 152 M510 150Z",
    "ME":"M484 178 L494 174 L500 182 M494 180 M486 178Z",
    "AL":"M484 182 L494 178 L500 188 L496 200 M490 190 M486 184Z",
    "MK":"M496 178 L506 174 L512 182 L508 192 M500 184 M498 180Z",
    "BA":"M492 172 L502 168 L508 176 L504 186 M496 178 M494 174Z",
    "XK":"M498 180 L506 176 L510 182 M504 182 M500 180Z",
    "MD":"M528 168 L540 164 L548 174 M540 174 M530 170Z",
    "AM":"M558 182 L568 178 L574 186 M566 184 M560 182Z",
    "AZ":"M568 192 L580 188 L586 196 M578 196 M570 194Z",
    "TM":"M560 200 L576 196 L584 204 M576 204 M562 202Z",
    "TJ":"M596 196 L608 192 L614 200 M606 200 M598 198Z",
    "KG":"M616 192 L632 188 L640 196 M632 196 M618 194Z",
    "LS":"M524 352 L534 348 L540 356 M534 354 M526 352Z",
    "SZ":"M498 352 L508 348 L514 356 M508 354 M500 352Z",
    "BW":"M498 358 L512 354 L522 364 L518 380 M512 368 M502 360Z",
    "NA":"M470 352 L486 348 L496 358 L492 374 M482 364 M472 356Z",
    "CV":"M398 268 L408 264 L414 272 M408 270 M400 268Z",
    "FM":"M840 292 L852 288 L858 296 M850 294 M842 292Z",
    "PW":"M848 298 L856 294 L860 300 M854 298 M850 298Z",
    "MH":"M832 288 L842 284 L848 292 M842 290 M834 288Z",
    "SB":"M858 358 L870 354 L876 362 M868 360 M860 358Z",
    "VU":"M872 376 L882 372 L888 380 M882 378 M874 376Z",
    "WS":"M878 368 L888 364 L894 372 M888 370 M880 368Z",
    "TO":"M880 382 L888 378 L892 384 M886 384 M882 382Z",
    "KI":"M858 332 L864 328 L868 334 M864 332 M860 332Z",
    "NR":"M858 340 L864 336 L868 342 M864 340 M860 340Z",
    "PW":"M848 298 L856 294 L860 300 M854 298 M850 298Z",
    "PG":"M798 328 L818 324 L832 334 M824 332 M802 330Z",
    "TL":"M748 310 L758 306 L764 314 M758 312 M750 310Z",
    "KP":"M768 186 L780 182 L786 190 M780 188 M770 186Z",
    "LA":"M662 292 L676 288 L686 298 L682 312 M670 302 M664 294Z",
    "MM":"M648 296 L664 292 L676 302 L672 318 M656 308 M650 300Z",
    "KH":"M672 296 L686 292 L696 302 L692 316 M680 306 M674 298Z",
    "BN":"M698 300 L708 296 L714 304 L710 314 M704 306 M700 300Z",
    "SG":"M672 314 L680 312 L684 318 L680 324 M676 320 M672 316Z",
    "HK":"M708 270 L716 268 L720 274 L716 280 M712 276 M708 272Z",
    "MO":"M700 268 L708 266 L712 272 M708 274 M702 270Z",
    "TW":"M748 242 L758 238 L764 246 L760 256 M754 248 M750 244Z"
  };

  // 颜色阶梯（翠绿系 — 与冬奥项目主题一致）
  function getFill(intensity) {
    if (intensity === undefined || intensity === 0) return '#e2e8f0';  // 无数据 — 浅灰
    if (intensity >= 0.8) return '#065f46';   // 深绿
    if (intensity >= 0.6) return '#047857';   // 中深绿
    if (intensity >= 0.4) return '#059669';   // 主题绿
    if (intensity >= 0.2) return '#10b981';   // 浅绿
    return '#6ee7b7';                         // 最浅绿
  }

  let pathsHTML = '';
  for (const [code, d] of Object.entries(PATHS)) {
    const info = countries[code];
    const intensity = info ? info.intensity : 0;
    const fill = getFill(intensity);
    const name = info ? info.name : code;
    const count = info ? info.count : 0;
    pathsHTML += `<path id="map-${code}" d="${d}" fill="${fill}" data-code="${code}" data-name="${name}" data-count="${count}"/>`;
  }
  svg.innerHTML = pathsHTML;

  // 图例
  if (legendEl) {
    legendEl.innerHTML = `
      <span style="font-weight:600;color:var(--text-secondary)">投稿量：</span>
      <div class="legend-bar">
        <div class="legend-step" style="background:#e2e8f0"></div><span>无</span>
        <div class="legend-step" style="background:#6ee7b7"></div><span>少</span>
        <div class="legend-step" style="background:#10b981"></div><span>中</span>
        <div class="legend-step" style="background:#059669"></div><span>多</span>
        <div class="legend-step" style="background:#065f46"></div><span>极多</span>
      </div>
    `;
  }

  // Hover tooltip
  svg.querySelectorAll('path').forEach(path => {
    path.addEventListener('mouseenter', e => {
      const name = path.dataset.name;
      const count = path.dataset.count;
      if (count && Number(count) > 0) {
        tooltip.textContent = `${name}: ${count} 件作品`;
        tooltip.classList.add('visible');
      }
    });
    path.addEventListener('mousemove', e => {
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      tooltip.style.left = x + 'px';
      tooltip.style.top = (y - 10) + 'px';
    });
    path.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });
  });
})();

/* ===== 模态层 ===== */
const modal = $('#modal');
const modalBody = $('#modalBody');

function openModal(bvid) {
  const v = (D.featuredVideos || []).find(f => f.bvid === bvid);
  if (!v && bvid) {
    // 非主编视频：只播放
    modalBody.innerHTML = `
      <iframe class="detail-player" src="//player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&as_wide=1" allowfullscreen loading="lazy"></iframe>
      <h2 class="detail-title">${esc($(`[data-bvid="${bvid}"]`)?.getAttribute('data-title') || '')}</h2>
    `;
  } else if (v) {
    const stats = [
      `▶ ${fmt(v.metrics.vhPlayW || '')}万 视频号`,
      `♥ ${fmt(v.metrics.redHeart)}`,
      `💬 ${fmt(v.metrics.comment)}`,
      `👍 ${fmt(v.metrics.like)}`,
      `↗ ${fmt(v.metrics.forward)}`,
      `视频号互动 ${fmt(v.metrics.vhInteract)}`
    ].join(' &nbsp;·&nbsp; ');
    const channel = v.channel || '';
    const date = v.date ? v.date.slice(0, 10) : '';

    modalBody.innerHTML = `
      ${v.cover ? `<img class="detail-cover" src="${v.cover}" alt="${esc(v.title)}" />` : ''}
      <iframe class="detail-player" src="//player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&as_wide=1" allowfullscreen loading="lazy"></iframe>
      <h2 class="detail-title">${esc(v.title)}</h2>
      <div class="detail-stats">
        <span>${stats}</span>
        <span>📅 ${date}</span>
        <span>📺 ${channel}</span>
      </div>
      ${v.publishCopy ? `
        <div class="detail-section">
          <h4>发布文案</h4>
          <div class="publish-copy">${nl2br(v.publishCopy)}</div>
        </div>` : ''}
      ${v.editorNote ? `
        <div class="detail-section">
          <h4>主编寄语</h4>
          <div class="editor-note">${nl2br(v.editorNote)}</div>
        </div>` : ''}
      ${v.script ? `
        <div class="detail-section">
          <h4>完整脚本</h4>
          <div class="detail-script">${nl2br(v.script)}</div>
        </div>` : ''
    `;
  }

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  modalBody.innerHTML = '';
}

modal.addEventListener('click', e => {
  if (e.target.hasAttribute('data-close') || e.target === modal) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ===== 导航栏滚动效果 ===== */
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  const nav = $('#nav');
  const scrollY = window.scrollY;
  if (nav) {
    nav.classList.toggle('scrolled', scrollY > 60);
  }
  lastScrollY = scrollY;
}, { passive: true });

/* ===== 年份 ===== */
$('#year').textContent = new Date().getFullYear();

console.log(`✅ Site ready — ${(D.allVideos||[]).length} videos, ${(D.featuredVideos||[]).length} featured, ${Object.keys(D.mapData?.countries||{}).length} countries`);
