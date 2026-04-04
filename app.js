'use strict';
// ── CONSTANTS
const LANG_TAG={"JavaScript": "tag-js", "TypeScript": "tag-ts", "HTML": "tag-htm", "CSS": "tag-css", "PHP": "tag-php", "Sass": "tag-sass", "Python": "tag-py", "Go": "tag-go", "Java": "tag-jv", "Kotlin": "tag-kt", "Ruby": "tag-rb", "Rust": "tag-rs", "C#": "tag-cs", "Scala": "tag-sc", "Elixir": "tag-ex", "Clojure": "tag-clj", "Perl": "tag-pl", "Erlang": "tag-erl", "OCaml": "tag-ml", "C": "tag-c", "C++": "tag-cpp", "Swift": "tag-sw", "Dart": "tag-drt", "Zig": "tag-zig", "Nim": "tag-nim", "Assembly": "tag-asm", "Shell": "tag-sh", "Bash": "tag-sh", "PowerShell": "tag-ps", "Lua": "tag-lua", "Groovy": "tag-grv", "SQL": "tag-sql", "R": "tag-r", "GraphQL": "tag-gql", "Julia": "tag-jl", "JSON": "tag-json", "YAML": "tag-yml", "TOML": "tag-toml", "XML": "tag-xml", "Markdown": "tag-md", "Dockerfile": "tag-doc", "Solidity": "tag-sol", "Haskell": "tag-hs", "F#": "tag-fs", "Terraform": "tag-tf", "Nginx": "tag-ngx", "Prisma": "tag-prm", "Proto": "tag-pb", "Crystal": "tag-cr", "V": "tag-v"};
const LANG_COLOR={"JavaScript":"#f7df1e","TypeScript":"#3178c6","HTML":"#e44d26","CSS":"#1572b6","Sass":"#cc6699","PHP":"#8892be","Vue":"#42b883","React":"#61dafb","Svelte":"#ff3e00","Python":"#3572a5","Go":"#00add8","Java":"#b07219","Kotlin":"#a97bff","Ruby":"#cc342d","Rust":"#dea584","C#":"#178600","Scala":"#c22d40","Elixir":"#6e4a7e","Clojure":"#db5855","Erlang":"#b83998","OCaml":"#3be133","Perl":"#0298c3","Groovy":"#4298b8","C":"#555555","C++":"#f34b7d","Swift":"#f05138","Dart":"#00b4ab","Zig":"#ec915c","Nim":"#ffc200","Assembly":"#6e4c13","Crystal":"#000100","V":"#5d87bf","Shell":"#89e051","Bash":"#4eaa25","PowerShell":"#5391fe","Lua":"#000080","SQL":"#e38c00","R":"#198ce7","GraphQL":"#e10098","Julia":"#a270ba","MATLAB":"#e16737","JSON":"#cbcb41","YAML":"#cb171e","TOML":"#9c4121","XML":"#0060ac","Markdown":"#083fa1","Dockerfile":"#384d54","Terraform":"#7b42bc","Nginx":"#009639","Kubernetes":"#326ce5","Solidity":"#aa6746","Vyper":"#1e1e1e","Haskell":"#5d4f85","F#":"#b845fc","Elm":"#60b5cc","Prolog":"#74283c","Prisma":"#0c344b","Proto":"#3f3f3f"};
const LANG_ABBR={"JavaScript":"JS","TypeScript":"TS","HTML":"HTML","CSS":"CSS","Sass":"SCSS","PHP":"PHP","Vue":"VUE","React":"JSX","Svelte":"SV","Python":"PY","Go":"GO","Java":"JV","Kotlin":"KT","Ruby":"RB","Rust":"RS","C#":"C#","Scala":"SC","Elixir":"EX","Clojure":"CLJ","Erlang":"ERL","OCaml":"ML","Perl":"PL","Groovy":"GRV","C":"C","C++":"C++","Swift":"SW","Dart":"DT","Zig":"ZIG","Nim":"NIM","Assembly":"ASM","Crystal":"CR","V":"V","Shell":"SH","Bash":"BSH","PowerShell":"PS","Lua":"LUA","SQL":"SQL","R":"R","GraphQL":"GQL","Julia":"JL","MATLAB":"MAT","JSON":"JSON","YAML":"YML","TOML":"TOML","XML":"XML","Markdown":"MD","Dockerfile":"DO","Terraform":"TF","Nginx":"NGX","Kubernetes":"K8S","Solidity":"SOL","Vyper":"VYP","Haskell":"HS","F#":"F#","Elm":"ELM","Prolog":"PRL","Prisma":"PRS","Proto":"PB"};
const LANG_HL={'JavaScript':'javascript','TypeScript':'typescript','Python':'python','PHP':'php','Go':'go','Rust':'rust','Java':'java','Kotlin':'kotlin','Swift':'swift','C':'c','C++':'cpp','C#':'csharp','Ruby':'ruby','Lua':'lua','Shell':'bash','SQL':'sql','HTML':'xml','CSS':'css','Dart':'dart','R':'r','Scala':'scala','Perl':'perl','Haskell':'haskell','Elixir':'elixir','Clojure':'clojure','YAML':'yaml','JSON':'json','Markdown':'markdown','Dockerfile':'dockerfile','GraphQL':'graphql','Solidity':'solidity'};
const LANG_EXT={JavaScript:'js',TypeScript:'ts',Python:'py',PHP:'php',Go:'go'};
// language colors for icon bg
const LANGS=["JavaScript", "TypeScript", "HTML", "CSS", "Sass", "PHP", "Vue", "React", "Svelte", "Python", "Go", "Java", "Kotlin", "Ruby", "Rust", "C#", "Scala", "Elixir", "Clojure", "Erlang", "OCaml", "Perl", "Groovy", "C", "C++", "Swift", "Dart", "Zig", "Nim", "Assembly", "Crystal", "V", "Shell", "Bash", "PowerShell", "Lua", "SQL", "R", "GraphQL", "Julia", "MATLAB", "JSON", "YAML", "TOML", "XML", "Markdown", "Dockerfile", "Terraform", "Nginx", "Kubernetes", "Solidity", "Vyper", "Haskell", "F#", "Elm", "Prolog", "Prisma", "Proto"];
// ── HASH ID — encode numeric DB id to 8-char hex for URLs
var ID_M1=0x9B4EA3C1,ID_M2=0x5A3F9C2E;
function encodeId(n){
  var x=(n>>>0);
  x=((x^ID_M1)>>>0);
  x=Math.imul(x,0x9e3779b9)>>>0;
  x=((x>>>16)^x)>>>0;
  x=((x^ID_M2)>>>0);
  return('00000000'+x.toString(16)).slice(-8);
}
function decodeId(hash){
  return rows.find(function(r){return encodeId(r.id)===hash;});
}

const ICONS={
  ok:'<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>',
  fail:'<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.553.553 0 0 1-1.1 0L7.1 4.995z"/>',
  info:'<path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>',
};

// ── STATE
let rows=[], curLang='all', curQ='', isAdmin=false;
let curSnip=null, editId=null, delId=null, toastTm=null;
const liked=new Set(JSON.parse(localStorage.getItem('mzx_liked')||'[]'));

// ── UTILS — safe helpers, never crash
const $   = id => document.getElementById(id);
const safe= el => el || {textContent:'',innerHTML:'',style:{},className:'',classList:{add:()=>{},remove:()=>{},toggle:()=>{},contains:()=>false},value:'',disabled:false};
const el  = id => safe($(id));
const gv  = id => { const e=$(id); return e ? e.value.trim() : ''; };
const sv  = (id,v) => { const e=$(id); if(e) e.value=v; };
const set = (id,v) => { const e=$(id); if(e) e.textContent=v; };
const html= (id,v) => { const e=$(id); if(e) e.innerHTML=v; };
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function fmtDate(d){
  if(!d) return '';
  try{
    var dt=new Date(d),now=new Date(),diff=now-dt;
    if(diff<60000) return 'baru saja';
    if(diff<3600000) return Math.floor(diff/60000)+' mnt lalu';
    if(diff<86400000) return Math.floor(diff/3600000)+' jam lalu';
    if(diff<604800000) return Math.floor(diff/86400000)+' hari lalu';
    return dt.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
  }catch(e){return '';}
}

function apiFetch(url,method,data,timeoutMs,creds){
  var ctrl=new AbortController();
  var t=setTimeout(function(){ctrl.abort();},timeoutMs||10000);
  var cr=creds||(url.indexOf('/admin')>=0||url.indexOf('/snippet-create')>=0||url.indexOf('/snippet-action')>=0?'include':'same-origin');
  return fetch(url,{
    method:method||'GET',credentials:cr,signal:ctrl.signal,
    headers:data?{'Content-Type':'application/json'}:{},
    body:data?JSON.stringify(data):undefined
  }).finally(function(){clearTimeout(t);});
}
function setBtn(id,on){const b=$(id);if(b){b.disabled=on;b.style.opacity=on?'.5':'1';}}

// ── BOOT
(async()=>{
  // admin-verify: short timeout, non-blocking if fails
  try{
    const r=await apiFetch('/api/admin-verify','GET',null,2500,'include');
    if(r.ok){ const d=await r.json(); if(d.admin) setAdminUI(true); }
  }catch(_){}
  await load();
  var sid=new URLSearchParams(location.search).get('id');
  if(sid){
    // Try hash decode first, fallback to numeric
    var srow=decodeId(sid)||rows.find(function(r){return String(r.id)===sid;});
    if(srow) openDetail(srow.id);
  }
  if(window.innerWidth>700){ const b=$(  'newBtnDesk'); if(b) b.style.display='inline-flex'; }
})();

// ── LOAD
function showSkeleton(){
  var listEl=$(  'list');
  if(!listEl) return;
  var skels='';
  for(var i=0;i<6;i++) skels+='<div class="skeleton" style="animation-delay:'+(i*.08)+'s"><div class="sk-icon"></div><div class="sk-body"><div class="sk-line sk-title"></div><div class="sk-line sk-desc"></div></div><div class="sk-right"><div class="sk-badge"></div><div class="sk-stat"></div></div></div>';
  listEl.innerHTML=skels;
}

// LocalStorage cache key
var CACHE_KEY='mzx_snippets_v1';
var CACHE_TTL=30*1000; // 30 seconds

function getCached(){
  try{
    var s=localStorage.getItem(CACHE_KEY);
    if(!s) return null;
    var obj=JSON.parse(s);
    if(Date.now()-obj.at>CACHE_TTL) return null;
    return obj.data;
  }catch(e){return null;}
}

function setCache(data){
  try{localStorage.setItem(CACHE_KEY,JSON.stringify({data:data,at:Date.now()}));}catch(e){}
}

function clearCache(){
  try{localStorage.removeItem(CACHE_KEY);}catch(e){}
}

async function load(retries){
  retries = (retries==null)?2:retries;

  // Show cached data immediately if available (zero wait)
  var cached=getCached();
  if(cached){
    rows=cached;
    rows.sort(function(a,b){return new Date(b.created_at)-new Date(a.created_at);});
    updateCounts();
    render();
  } else {
    showSkeleton();
  }

  for(var i=0;i<=retries;i++){
    try{
      var r=await apiFetch('/api/snippets','GET',null,8000);
      if(!r.ok) throw new Error('HTTP '+r.status);
      var d=await r.json();
      rows=Array.isArray(d)?d:[];
      // Sort terbaru di atas
      rows.sort(function(a,b){return new Date(b.created_at)-new Date(a.created_at);});
      setCache(rows);
      updateCounts();
      render();
      return;
    }catch(e){
      if(i<retries){ await new Promise(function(rr){setTimeout(rr,600*(i+1));}); continue; }
      var listEl2=$(  'list');
      if(listEl2) listEl2.innerHTML='<div class="empty-state">'
        +'<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.553.553 0 0 1-1.1 0L7.1 4.995z"/></svg>'
        +'<h3>Gagal memuat data</h3>'
        +'<p style="color:var(--text2);font-size:12px;margin-bottom:6px">Periksa koneksi atau coba lagi.</p>'
        +'<p style="color:var(--red);font-family:var(--mono);font-size:10px">'+esc(e.message)+'</p>'
        +'<button onclick="load()" style="margin-top:12px;padding:7px 16px;border-radius:8px;background:rgba(124,109,250,.1);border:1px solid rgba(124,109,250,.3);color:var(--accentl);cursor:pointer;font-size:12px;font-family:var(--mono);touch-action:manipulation">↻ Coba lagi</button>'
        +'</div>';
    }
  }
}

// ── PAGINATION STATE
var PAGE_SIZE = 10;
var curPage   = 1;
var filteredList = [];

// ── RENDER
function render(){
  curPage = 1;
  var list=rows.slice();
  if(curLang!=='all') list=list.filter(function(r){return r.language===curLang;});
  if(curQ){
    var q=curQ.toLowerCase();
    list=list.filter(function(r){
      return (r.title||'').toLowerCase().indexOf(q)>=0
        ||(r.description||'').toLowerCase().indexOf(q)>=0
        ||(r.author||'').toLowerCase().indexOf(q)>=0
        ||tagArr(r.tags).some(function(t){return t.toLowerCase().indexOf(q)>=0;});
    });
  }
  filteredList = list;
  var lbl=curLang==='all'?'Explore.':curLang+'.';
  set('pageTitle', curQ?('"'+curQ+'"'):lbl);
  set('pageSub', curQ
    ? list.length+' hasil untuk "'+curQ+'"'
    : list.length>0 ? list.length+' snippet '+(curLang==='all'?'tersedia':'dalam '+curLang) : 'Browse koleksi snippet code siap pakai.');
  set('resultCount', list.length+' snippet');
  var listEl=$(  'list');
  if(!listEl) return;
  if(!list.length){
    listEl.innerHTML='<div class="empty-state">'
      +'<svg viewBox="0 0 16 16" fill="currentColor"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>'
      +'<h3>'+(curQ?'Tidak ditemukan':'Belum ada snippet')+'</h3>'
      +'<p>'+(curQ?'Coba keyword lain':'Jadilah yang pertama upload!')+'</p>'
      +'</div>';
    return;
  }
  renderPage(list, 1, true);
}

function timeAgo(dateStr){
  if(!dateStr) return '';
  var diff=Date.now()-new Date(dateStr).getTime();
  var m=Math.floor(diff/60000);
  if(m<1) return 'baru saja';
  if(m<60) return m+' mnt lalu';
  var h=Math.floor(m/60);
  if(h<24) return h+' jam lalu';
  var d=Math.floor(h/24);
  if(d<30) return d+' hari lalu';
  var mo=Math.floor(d/30);
  if(mo<12) return mo+' bln lalu';
  return Math.floor(mo/12)+' thn lalu';
}



function makeRowHTML(s, i){
  var col  = LANG_COLOR[s.language]||'#8888aa';
  var abbr = LANG_ABBR[s.language]||((s.language||'?').substring(0,3).toUpperCase());
  var tc   = LANG_TAG[s.language]||'tag-def';
  var tags = tagArr(s.tags).slice(0,2).map(function(t){return '<span class="tag tag-def">'+esc(t)+'</span>';}).join('');
  var date = fmtDate(s.created_at);
  return '<div class="srow" onclick="openDetail('+Number(s.id)+')" role="button" tabindex="0" onkeydown="if(event.key===\'Enter\')openDetail('+Number(s.id)+')">'
    +'<div class="srow-icon" style="background:'+col+'18;border:1px solid '+col+'44;color:'+col+'">'+abbr+'</div>'
    +'<div class="srow-body">'
      +'<div class="srow-top">'
        +'<span class="srow-title">'+esc(s.title||'Untitled')+'</span>'
        +'<span class="tag '+tc+'">'+esc(s.language||'?')+'</span>'
        +tags
      +'</div>'
      +'<div class="srow-desc">'+esc(s.description||'')+'</div>'
      +(date?'<div class="srow-meta">'+esc(s.author||'anon')+' &middot; '+date+'</div>':'')
    +'</div>'
    +'<div class="srow-right">'
      +'<div class="srow-stats">'
        +'<span class="ss ss-like"><svg viewBox="0 0 16 16" fill="currentColor"><path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748z"/></svg>'+(s.likes||0)+'</span>'
        +'<span class="ss ss-view"><svg viewBox="0 0 16 16" fill="currentColor"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zm-8 3.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>'+(s.views||0)+'</span>'
      +'</div>'
      +'<span class="srow-arrow">&#8250;</span>'
    +'</div>'
    +'</div>';
}

function renderPage(list, page, reset){
  var listEl = $(  'list');
  if(!listEl) return;
  var end   = page * PAGE_SIZE;
  var slice = list.slice(0, end);
  var total = list.length;
  var html_ = slice.map(function(s,i){ return makeRowHTML(s,i); }).join('');
  var remaining = total - end;
  if(remaining > 0){
    html_ += '<div class="load-more-wrap" id="loadMoreWrap">'
      +'<div class="load-more-info">Menampilkan '+end+' dari '+total+' snippet</div>'
      +'<button class="load-more-btn" onclick="loadMore()">'
        +'<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 7.646a.5.5 0 0 1 .708 0L8 10.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z"/><path d="M8 5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 8 5z"/></svg>'
        +'Lihat '+remaining+' snippet lainnya'
      +'</button>'
      +'</div>';
  } else if(total > PAGE_SIZE){
    html_ += '<div class="load-more-wrap"><div class="load-more-info">Semua '+total+' snippet ditampilkan</div></div>';
  }
  if(reset){
    listEl.innerHTML = html_;
  } else {
    var oldWrap = listEl.querySelector('#loadMoreWrap');
    if(oldWrap) oldWrap.remove();
    var tmp = document.createElement('div');
    tmp.innerHTML = '<div>' + html_ + '</div>';
    var newRows = tmp.querySelectorAll('.srow');
    newRows.forEach(function(row){ listEl.appendChild(row); });
    var newWrap = tmp.querySelector('#loadMoreWrap, .load-more-wrap');
    if(newWrap) listEl.appendChild(newWrap);
  }
  curPage = page;
}

function loadMore(){
  renderPage(filteredList, curPage + 1, false);
}


function tagArr(t){
  if(Array.isArray(t)) return t;
  if(typeof t==='string'&&t) return t.split(',').map(function(x){return x.trim();});
  return [];
}

// ── DETAIL
async function openDetail(id){
  var s=rows.find(function(r){return r.id===id||r.id===String(id);});
  if(!s) return;
  curSnip=s;
  apiFetch('/api/snippets','POST',{action:'view',id:id})
    .then(function(r){return r.ok&&r.json();})
    .then(function(d){if(d&&d.views!=null){s.views=d.views;updateCounts();}})
    .catch(function(){});
  var tc=LANG_TAG[s.language]||'tag-def';
  set('d-lp',s.language||'?');
  var lp=$(  'd-lp'); if(lp) lp.className='tag '+tc;
  set('d-auth','by '+(s.author||'anon'));
  set('d-title',s.title||'Untitled');
  set('d-desc',s.description||'');
  html('d-tags',tagArr(s.tags).map(function(t){return '<span class="tag tag-def">'+esc(t)+'</span>';}).join(''));
  set('d-fname',(s.title||'snippet').toLowerCase().replace(/\s+/g,'-')+'.'+(LANG_EXT[s.language]||'txt'));
  var ce=$(  'd-code');
  if(ce){
    var hlLang='language-'+(LANG_HL[s.language]||s.language||'').toLowerCase();
    if(s.code){
      ce.textContent=s.code;
      ce.className='hljs '+hlLang;
      if(window.hljs) hljs.highlightElement(ce);
    } else {
      ce.textContent='Loading…';
      ce.className='hljs';
      apiFetch('/api/snippet-get?id='+s.id,'GET',null,8000).then(function(r){
        return r.ok?r.json():null;
      }).then(function(full){
        if(!full||!full.code) return;
        s.code=full.code;
        ce.textContent=full.code;
        ce.className='hljs '+hlLang;
        if(window.hljs) hljs.highlightElement(ce);
      }).catch(function(){ce.textContent='Gagal memuat kode.';});
    }
  }

  set('shareUrl',window.location.origin+'/app?id='+encodeId(s.id));
  var date=s.created_at?timeAgo(s.created_at):'';
  html('dinfo','<b>'+esc(s.author||'anon')+'</b><br>'
    +'<span style="color:var(--text3);font-size:10px">'+esc(date)+'</span><br>'
    +'<span style="color:var(--pink)">♥ '+(s.likes||0)+'</span>'
    +' &nbsp;<span style="color:var(--blue)">👁 '+(s.views||0)+'</span>');
  var isLiked=liked.has(String(id));
  html('dacts','<button class="like-btn'+(isLiked?' liked':'')+'" id="likeBtn" onclick="toggleLike('+id+')">'
    +'<svg viewBox="0 0 16 16" fill="currentColor"><path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748z"/></svg>'
    +(isLiked?'Liked':'Like')+' · '+(s.likes||0)+'</button>'
    +'<button class="btn btn-ghost btn-sm" onclick="closeOv(\'ov-detail\');openEditM('+id+')"> Edit</button>'
    +'<button class="btn btn-danger btn-sm" onclick="closeOv(\'ov-detail\');openDelM('+id+')"> Del</button>');
  openOv('ov-detail');
  history.replaceState(null,'','?id='+encodeId(id));
}

// ── LIKE
async function toggleLike(id){
  var s=rows.find(function(r){return r.id===id;});
  if(!s) return;
  var k=String(id), wasLiked=liked.has(k);
  try{
    var r=await apiFetch('/api/snippets','POST',{action:wasLiked?'unlike':'like',id:id});
    var d=await r.json();
    if(r.status===429){toast('⏳ Tunggu sebentar sebelum like lagi','info');return;}
    if(!r.ok){toast(d.error||'Gagal','fail');return;}
    s.likes=d.likes;
    wasLiked?liked.delete(k):liked.add(k);
    localStorage.setItem('mzx_liked',JSON.stringify(Array.from(liked)));
    var nowLiked=liked.has(k);
    var btn=$(  'likeBtn');
    if(btn){
      btn.className='like-btn'+(nowLiked?' liked':'');
      btn.innerHTML='<svg viewBox="0 0 16 16" fill="currentColor"><path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748z"/></svg>'+(nowLiked?'Liked':'Like')+' · '+d.likes;
    }
    html('dinfo','<b>'+esc(s.author||'anon')+'</b><br><span style="color:var(--pink)">♥ '+d.likes+'</span> &nbsp;<span style="color:var(--blue)">views: '+(s.views||0)+'</span>');
    // Update only the specific row counter, not full re-render
    updateCounts();
    toast(nowLiked?'♥ Liked!':'Unliked','ok');
  }catch(e){toast(e.message,'fail');}
}




function copyCode(){
  if(!curSnip||!curSnip.code) return;
  navigator.clipboard.writeText(curSnip.code).then(function(){toast('Copied','ok');});
}
function copyShareLink(){
  var su=$(  'shareUrl');
  if(su) navigator.clipboard.writeText(su.textContent).then(function(){toast('Link copied','info');});
}
function openRaw(){
  if(!curSnip||!curSnip.code) return;
  var blob=new Blob([curSnip.code],{type:'text/plain;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  window.open(url,'_blank');
  setTimeout(function(){URL.revokeObjectURL(url);},5000);
}



// ── NEW SNIPPET
async function submitNew(){
  var hp=document.getElementById('n-hp');
  var f={author:gv('n-author'),title:gv('n-title'),description:gv('n-desc'),tags:gv('n-tags'),language:gv('n-lang'),code:gv('n-code'),snippetKey:gv('n-key'),_hp:hp?hp.value:''};
  ['author','title','description','code','snippetKey'].forEach(function(k){
    var eid='er-'+k, iid=k==='description'?'n-desc':k==='snippetKey'?'n-key':'n-'+k;
    var ee=$(eid); if(ee) ee.textContent='';
    var ii=$(iid); if(ii) ii.classList.remove('err');
  });
  setBtn('btnNew',true);
  try{
    var r=await apiFetch('/api/snippet-create','POST',f);
    var d=await r.json();
    if(!r.ok){
      if(d.errors) Object.keys(d.errors).forEach(function(k){
        var ee=$(  'er-'+k); if(ee) ee.textContent=d.errors[k];
        var iid=k==='description'?'n-desc':k==='snippetKey'?'n-key':'n-'+k;
        var ii=$(iid); if(ii) ii.classList.add('err');
      });
      else toast(d.error||'Gagal','fail');
      return;
    }
    clearCache();
    toast('Snippet uploaded!','ok');
    closeOv('ov-new');
    ['n-author','n-title','n-desc','n-tags','n-code','n-key'].forEach(function(id){var e=$(id);if(e)e.value='';});
    await load();
  }catch(e){toast(e.message,'fail');}
  finally{setBtn('btnNew',false);}
}

// ── EDIT
function openEditM(id){
  var s=rows.find(function(r){return r.id===id;});
  if(!s) return;
  editId=id;
  sv('e-title',s.title||''); sv('e-lang',s.language||'JavaScript');
  sv('e-desc',s.description||''); sv('e-tags',tagArr(s.tags).join(', '));
  sv('e-code',s.code||''); sv('e-key','');
  var ee=$(  'er-ekey'); if(ee) ee.textContent='';
  var ew=$(  'editKeyWrap'); if(ew) ew.style.display=isAdmin?'none':'block';
  openOv('ov-edit');
}
async function submitEdit(){
  var ee=$(  'er-ekey'); if(ee) ee.textContent='';
  setBtn('btnEdit',true);
  try{
    var body={id:editId,title:gv('e-title'),language:gv('e-lang'),description:gv('e-desc'),tags:gv('e-tags'),code:gv('e-code')};
    if(!isAdmin) body.snippetKey=gv('e-key');
    var r=await apiFetch('/api/snippet-action','PUT',body);
    var d=await r.json();
    if(!r.ok){var ee2=$(  'er-ekey');if(ee2)ee2.textContent=d.error||'Gagal';return;}
    clearCache(); toast('Updated ✓','ok'); closeOv('ov-edit'); await load();
  }catch(e){toast(e.message,'fail');}
  finally{setBtn('btnEdit',false);}
}

// ── DELETE
function openDelM(id){
  var s=rows.find(function(r){return r.id===id;});
  if(!s) return;
  delId=id;
  set('del-name',s.title||'Untitled');
  sv('d-key','');
  var ee=$(  'er-dkey'); if(ee) ee.textContent='';
  var dw=$(  'delKeyWrap'); if(dw) dw.style.display=isAdmin?'none':'block';
  openOv('ov-del');
}
async function submitDel(){
  var ee=$(  'er-dkey'); if(ee) ee.textContent='';
  try{
    var body={id:delId};
    if(!isAdmin) body.snippetKey=gv('d-key');
    var r=await apiFetch('/api/snippet-action','DELETE',body);
    var d=await r.json();
    if(!r.ok){var ee2=$(  'er-dkey');if(ee2)ee2.textContent=d.error||'Gagal';return;}
    clearCache(); toast('Dihapus','info'); closeOv('ov-del');
    history.replaceState(null,'','/app');
    await load();
  }catch(e){toast(e.message,'fail');}
}

// ── ADMIN
function togglePassVis(){
  var inp=$(  'a-pass'), btn=$(  'togglePass'), ico=$(  'eyeIcon');
  if(!inp) return;
  var showing = inp.type === 'text';
  inp.type = showing ? 'password' : 'text';
  if(btn) btn.style.color = showing ? 'var(--text3)' : 'var(--accentl)';
  if(ico) ico.innerHTML = showing
    ? '<path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>'
    : '<path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709z"/><path d="M13.646 14.354l-12-12 .708-.708 12 12-.708.708z"/>';
}

async function doLogin(){
  var ea=$(  'er-admin'); if(ea) ea.textContent='';
  setBtn('btnLogin',true);
  try{
    var r=await apiFetch('/api/admin-login','POST',{username:gv('a-user'),password:gv('a-pass')});
    var d=await r.json();
    if(!r.ok){var ea2=$(  'er-admin');if(ea2)ea2.textContent=d.error||'Login gagal';return;}
    setAdminUI(true); closeOv('ov-admin'); toast('Admin logged in ⚡','ok');
  }catch(e){var ea3=$(  'er-admin');if(ea3)ea3.textContent=e.message;}
  finally{setBtn('btnLogin',false);}
}
async function doLogout(){
  await apiFetch('/api/admin-logout','POST').catch(function(){});
  setAdminUI(false); toast('Logged out','info');
}
function setAdminUI(on){
  isAdmin=on;
  var chip=$(  'adminChip'); if(chip) chip.classList.toggle('on',on);
  var btn=$(  'adminBtn');
  if(btn){btn.textContent=on?'Logout':'Login';btn.onclick=on?doLogout:function(){openOv('ov-admin');};}
  var db=$(  'drawerAdminBtn');
  if(db){
    db.innerHTML='<span class="di">'+(on?'×':'⚡')+'</span>'+(on?'Logout Admin':'Login Admin');
    db.onclick=on?function(){closeDrawer();doLogout();}:function(){closeDrawer();openOv('ov-admin');};
  }
  // Show/hide clean spam button
  var cb=$(  'cleanSpamBtn');
  if(cb) cb.style.display=on?'inline-flex':'none';
}

async function cleanSpam(){
  if(!isAdmin){toast('Login admin dulu','fail');return;}
  if(!confirm('Hapus semua snippet spam (0 likes, 0 views, judul random)?')) return;
  try{
    var r=await apiFetch('/api/admin-clean','DELETE');
    var d=await r.json();
    if(!r.ok){toast(d.error||'Gagal','fail');return;}
    toast('Terhapus '+d.deleted+' spam snippet','ok');
    await load();
  }catch(e){toast(e.message,'fail');}
}

// ── FILTER & SEARCH
function setLang(l){
  curLang=l;
  document.querySelectorAll('[data-lang]').forEach(function(e){e.classList.toggle('on',e.dataset.lang===l);});
  render();
}
function drawerSetLang(l){ closeDrawer(); setLang(l); }
var _searchTimer=null;
function doSearch(q){
  if(_searchTimer) clearTimeout(_searchTimer);
  _searchTimer=setTimeout(function(){
    curQ=(q||'').trim();
    render();
  },150);
  var a=$(  'searchInp'), b=$(  'mobSearchInp');
  if(a&&a!==document.activeElement) a.value=q;
  if(b&&b!==document.activeElement) b.value=q;
}

// ── COUNTS
function updateCounts(){
  if(window._countTimer) clearTimeout(window._countTimer);
  window._countTimer=setTimeout(function(){
    var fmt=function(n){return n>=1000?(n/1000).toFixed(1)+'k':String(n);};
    var total=rows.length,likes=0,views=0,lmap={};
    for(var i=0;i<rows.length;i++){
      var r=rows[i];
      likes+=(r.likes||0); views+=(r.views||0);
      if(r.language) lmap[r.language]=(lmap[r.language]||0)+1;
    }
    set('dSTotal',fmt(total));set('dSLikes',fmt(likes));set('dSViews',fmt(views));
    set('dc-all',total);set('sc-all',total);
    LANGS.forEach(function(l){var n=lmap[l]||0;set('dc-'+l,n);set('sc-'+l,n);});
    set('sl-total',fmt(total));set('sl-likes',fmt(likes));set('sl-views',fmt(views));
  },50);
}

// ── DRAWER
function openDrawer(){
  var d=$(  'drawer'),o=$(  'drawerOverlay');
  if(d) d.classList.add('open');
  if(o) o.classList.add('open');
  document.body.style.overflow='hidden';
}
function closeDrawer(){
  var d=$(  'drawer'),o=$(  'drawerOverlay');
  if(d) d.classList.remove('open');
  if(o) o.classList.remove('open');
  document.body.style.overflow='';
}

// ── MOBILE SEARCH
function toggleMobSearch(){
  var b=$(  'mobSearchbar');
  if(!b) return;
  b.classList.toggle('show');
  if(b.classList.contains('show')){var i=$(  'mobSearchInp');if(i)i.focus();}
}

// ── MODAL
function openOv(id){var e=$(id);if(e){e.classList.add('open');document.body.style.overflow='hidden';}}
function closeOv(id){
  var e=$(id);if(e){e.classList.remove('open');document.body.style.overflow='';if(id==='ov-detail')history.replaceState(null,'','/app');}
  // Reset password field visibility
  if(id==='ov-admin'){
    var p=$(  'a-pass'); if(p) p.type='password';
    var b=$(  'togglePass'); if(b) b.style.color='var(--text3)';
  }
}
function bgClose(e,id){if(e.target===e.currentTarget)closeOv(id);}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){

    document.querySelectorAll('.ov.open').forEach(function(el){el.classList.remove('open');});
    closeDrawer();
    document.body.style.overflow='';
    history.replaceState(null,'','/app');
  }
});

// ── TOAST
function toast(msg,type){
  var t=$(  'toast');
  if(!t) return;
  var m=$(  't-msg'),i=$(  't-ico');
  if(m) m.textContent=msg;
  if(i) i.innerHTML=ICONS[type]||ICONS.ok;
  t.className='toast '+(type||'ok')+' show';
  clearTimeout(toastTm);
  toastTm=setTimeout(function(){t.classList.remove('show');},3000);
}
