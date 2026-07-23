/* ===== 工具函数 ===== */
const D = window.SITE_DATA;
const $ = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

function fmt(n) { return n ? Number(n).toLocaleString() : '-'; }
function esc(str) { return String(str || '').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function nl2br(str) { return esc(str).replace(/\n/g,'<br>'); }

/* ===== 渲染 profile ===== */
$('#role').textContent = D.profile.role;
$('#tagline').textContent = D.profile.tagline;
$('#intro').textContent = D.profile.intro;
$('#aboutIntro').textContent = D.profile.intro;
$('#contact').textContent = D.profile.contact;
$('#year').textContent = new Date().getFullYear();

/* ===== 渲染视频网格 ===== */
const grid = $('#videoGrid');
const all = D.allVideos;
const featuredBvids = new Set(D.featuredVideos.map(v => v.bvid));

// 优先显示主编视频，再显示其余
const ordered = [
  ...all.filter(v => featuredBvids.has(v.bvid)),
  ...all.filter(v => !featuredBvids.has(v.bvid) && v.status === '已发布')
];

ordered.forEach((v, i) => {
  const card = document.createElement('div');
  card.className = 'video-card';
  card.style.animationDelay = (i % 6) * .05 + 's';
  card.setAttribute('data-bvid', v.bvid);
  card.setAttribute('data-title', esc(v.title));
  card.innerHTML = `
    <img class="thumb" src="${v.cover || 'assets/placeholder.svg'}" alt="${esc(v.title)}" loading="lazy" />
    <div class="meta">
      <h3>${esc(v.title)}${v.isEditor ? '<span class="editor-badge">主编</span>' : ''}</h3>
      <div class="stats">
        <span>▶ ${fmt(v.playW)}万</span>
        <span>♥ ${fmt(v.redHeart || v.like)}</span>
        <span>💬 ${fmt(v.comment)}</span>
      </div>
    </div>
  `;
  card.addEventListener('click', () => openModal(v.bvid));
  grid.appendChild(card);
});

/* ===== 渲染 Campaign ===== */
const cl = $('#campaignList');
D.campaigns.forEach(c => {
  const card = document.createElement('div');
  card.className = 'campaign-card';
  let metricsHTML = '';
  if (c.metrics) {
    for (const [k, v] of Object.entries(c.metrics)) {
      metricsHTML += `<div class="metric"><div class="val">${v}</div><div class="lbl">${k}</div></div>`;
    }
  }
  let highlightsHTML = (c.highlights || []).map(h => `<span class="hl">${h}</span>`).join('');
  let channelsHTML = '';
  if (c.channels && c.channels.length) {
    channelsHTML = '<table class="channels-table"><thead><tr><th>渠道</th><th>曝光量(万)</th><th>具体项目</th></tr></thead><tbody>' +
      c.channels.map(r => `<tr><td>${r.channel}</td><td>${r.exposureW}</td><td>${r.project}</td></tr>`).join('') +
      '</tbody></table>';
  }
  card.innerHTML = `
    <div class="campaign-header"><h3>${c.name}</h3><span class="campaign-tag">${c.tagline}</span></div>
    <p class="campaign-summary">${c.summary}</p>
    <div class="campaign-metrics">${metricsHTML}</div>
    <div class="campaign-highlights">${highlightsHTML}</div>
    ${channelsHTML}
  `;
  cl.appendChild(card);
});

/* ===== 模态层 ===== */
const modal = $('#modal');
const modalBody = $('#modalBody');

function openModal(bvid) {
  const v = D.featuredVideos.find(f => f.bvid === bvid);
  if (!v) {
    // 非主编视频：只播放
    modalBody.innerHTML = `
      <iframe class="detail-player" src="//player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&as_wide=1" allowfullscreen loading="lazy"></iframe>
      <h2 class="detail-title">${esc($(`[data-bvid="${bvid}"]`)?.getAttribute('data-title') || '')}</h2>
    `;
  } else {
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
        </div>` : ''}
    `;
  }
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal-dialog').scrollTop = 0;
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

/* ===== 滚动渐入动画 ===== */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

$$('.section').forEach(s => {
  s.style.opacity = '0';
  s.style.transform = 'translateY(24px)';
  s.style.transition = 'opacity .5s ease-out, transform .5s ease-out';
  observer.observe(s);
});

console.log('Site ready — ' + D.allVideos.length + ' videos, ' + D.featuredVideos.length + ' featured, ' + D.campaigns.length + ' campaigns');
