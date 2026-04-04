'use strict';
// ── SMOOTH SCROLL helper
function smoothTo(hash) {
  const el = document.querySelector(hash);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── TABS — show/hide panes
function showTab(name, btn) {
  document.querySelectorAll('.tabpane').forEach(el => el.classList.remove('on'));
  const target = document.getElementById('tab-' + name);
  if (target) target.classList.add('on');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  if (btn) btn.classList.add('on');
}

// ── COPY inline text
function cpEx(btn, text) {
  navigator.clipboard.writeText(text.trim()).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ ok'; btn.classList.add('ok');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('ok'); }, 2000);
  }).catch(() => { btn.textContent = 'err'; });
}

// ── COPY from pre element
function cpEl(btn, id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText((el.innerText || el.textContent).trim()).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ ok'; btn.classList.add('ok');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('ok'); }, 2000);
  }).catch(() => { btn.textContent = 'err'; });
}

// ── Active nav on scroll
const secIds   = ['owner', 'docs'];
const navLinks = document.querySelectorAll('.tnav a[href^="#"]');
const obs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('on'));
      const link = document.querySelector(`.tnav a[href="#${entry.target.id}"]`);
      if (link) link.classList.add('on');
    }
  });
}, { threshold: 0.3 });
secIds.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });

// ── Live stats + DB status dari API
async function loadStats(retry) {
  const statusEl  = document.getElementById('dbStatus');
  const statusTxt = document.getElementById('dbStatusText');
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  try {
    const start = Date.now();
    const ctrl=new AbortController();
    const to=setTimeout(()=>ctrl.abort(),8000);
    const r = await fetch('/api/snippets',{signal:ctrl.signal});
    clearTimeout(to);
    const ms = Date.now() - start;
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    if (statusEl)  statusEl.className  = 'db-status connected';
    if (statusTxt) statusTxt.textContent = 'Database terhubung — ' + ms + 'ms · Supabase';
    if (!Array.isArray(data)) return;
    const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n);
    set('sTotal', fmt(data.length));
    set('sLikes', fmt(data.reduce(function(a,s){return a+(s.likes||0);}, 0)));
    set('sViews', fmt(data.reduce(function(a,s){return a+(s.views||0);}, 0)));
  } catch(e) {
    if (statusEl)  statusEl.className  = 'db-status error';
    if (statusTxt) statusTxt.textContent = 'Database tidak terhubung — ' + e.message;
    const set2 = (id) => { const e = document.getElementById(id); if (e) e.textContent = '—'; };
    set2('sTotal'); set2('sLikes'); set2('sViews');
    // Retry once after 3s
    if (!retry) setTimeout(function(){ loadStats(true); }, 3000);
  }
}
loadStats(false);
