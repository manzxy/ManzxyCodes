'use strict';
// ── LOGO FALLBACK
function logoFallback(el){
  var d=document.createElement('div');
  d.className='logo-mark';
  d.textContent='Mz';
  if(el.parentNode) el.parentNode.replaceChild(d,el);
}

// ── SMOOTH SCROLL
function smoothTo(hash) {
  try {
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch(e) {}
}

// ── TABS
function showTab(name, btn) {
  document.querySelectorAll('.tabpane').forEach(el => el.classList.remove('on'));
  const target = document.getElementById('tab-' + name);
  if (target) target.classList.add('on');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  if (btn) btn.classList.add('on');
}

// ── COPY inline text (with execCommand fallback for old mobile browsers)
function cpEx(btn, text) {
  const orig = btn.textContent;
  const ok   = () => { btn.textContent = '✓ ok'; btn.classList.add('ok'); setTimeout(() => { btn.textContent = orig; btn.classList.remove('ok'); }, 2000); };
  const fail = () => { btn.textContent = 'err';  setTimeout(() => { btn.textContent = orig; }, 2000); };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(String(text).trim()).then(ok).catch(fail);
  } else {
    try {
      const ta = document.createElement('textarea');
      ta.value = String(text).trim();
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand('copy') ? ok() : fail();
      document.body.removeChild(ta);
    } catch { fail(); }
  }
}

// ── COPY from pre element by id
function cpEl(btn, id) {
  const el = document.getElementById(id);
  if (!el) return;
  cpEx(btn, (el.innerText || el.textContent).trim());
}

// ── Active nav highlight on scroll
(function() {
  const secIds   = ['owner', 'docs'];
  const navLinks = document.querySelectorAll('.tnav a[href^="#"]');
  if (!navLinks.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => a.classList.remove('on'));
        const link = document.querySelector(`.tnav a[href="#${entry.target.id}"]`);
        if (link) link.classList.add('on');
      }
    });
  }, { threshold: 0.25, rootMargin: '-60px 0px -60% 0px' });
  secIds.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
})();

// ── Live stats + DB status
async function loadStats(isRetry) {
  const statusEl  = document.getElementById('dbStatus');
  const statusTxt = document.getElementById('dbStatusText');
  const setEl     = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const fmt       = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);

  try {
    const ctrl = new AbortController();
    const to   = setTimeout(() => ctrl.abort(), 8000);
    const t0   = Date.now();
    const r    = await fetch('/api/snippets', { signal: ctrl.signal });
    clearTimeout(to);
    const ms   = Date.now() - t0;

    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();

    if (statusEl)  statusEl.className        = 'db-status connected';
    if (statusTxt) statusTxt.textContent     = `Database terhubung — ${ms}ms · Supabase`;

    if (!Array.isArray(data)) return;
    setEl('sTotal', fmt(data.length));
    setEl('sLikes', fmt(data.reduce((a, s) => a + (s.likes || 0), 0)));
    setEl('sViews', fmt(data.reduce((a, s) => a + (s.views || 0), 0)));

  } catch (e) {
    if (statusEl)  statusEl.className        = 'db-status error';
    if (statusTxt) statusTxt.textContent     = 'Database tidak terhubung — ' + (e.message || 'timeout');
    setEl('sTotal', '—'); setEl('sLikes', '—'); setEl('sViews', '—');
    if (!isRetry) setTimeout(() => loadStats(true), 3500);
  }
}

loadStats(false);

// ── THEME SYSTEM
(function(){
  var THEMES=['light','dark','black'];
  var ICONS_TH={light:'☀️',dark:'🌙',black:'⬛'};
  var LABELS={light:'Light',dark:'Dark',black:'Black'};

  function getSaved(){
    try{ return localStorage.getItem('mzx_theme')||'light'; }catch(e){return 'light';}
  }
  function setSaved(t){
    try{ localStorage.setItem('mzx_theme',t); }catch(e){}
  }
  function apply(t){
    document.documentElement.setAttribute('data-theme', t==='light'?'':t);
    setSaved(t);
    document.querySelectorAll('.theme-opt').forEach(function(el){
      el.classList.toggle('active', el.dataset.theme===t);
    });
    var btn=document.getElementById('themeBtnIcon');
    if(btn) btn.textContent=ICONS_TH[t]||'🌙';
  }

  function buildPicker(container){
    container.innerHTML='';
    var btn=document.createElement('button');
    btn.className='theme-btn';
    btn.id='themeBtnIcon';
    btn.title='Ganti tema';
    btn.setAttribute('aria-label','Pilih tema');
    var saved=getSaved();
    btn.textContent=ICONS_TH[saved]||'☀️';
    container.appendChild(btn);

    var dd=document.createElement('div');
    dd.className='theme-dropdown';
    THEMES.forEach(function(t){
      var opt=document.createElement('button');
      opt.className='theme-opt'+(saved===t?' active':'');
      opt.dataset.theme=t;
      var dot=document.createElement('span');
      dot.className='theme-dot td-'+t;
      opt.appendChild(dot);
      opt.appendChild(document.createTextNode(LABELS[t]));
      opt.addEventListener('click',function(e){
        e.stopPropagation();
        apply(t);
        container.classList.remove('open');
      });
      dd.appendChild(opt);
    });
    container.appendChild(dd);

    btn.addEventListener('click',function(e){
      e.stopPropagation();
      container.classList.toggle('open');
    });
    document.addEventListener('click',function(){
      container.classList.remove('open');
    });
  }

  function init(){
    apply(getSaved());
    var el=document.getElementById('themePicker');
    if(el) buildPicker(el);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  } else { init(); }
})();
