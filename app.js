const STORAGE_KEY='chordLiveV4';
const LEGACY_SONGS='songs', LEGACY_SETLISTS='setlists';
const notes=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const flatToSharp={Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'};
const sharpToFlat={'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb'};
let state={songs:[],setlists:[]};
let currentSongId=null,currentTranspose=0,currentSetlistId=null,currentSetlistPos=null,editingSongId=null;
let fontSize=20;

const $=id=>document.getElementById(id);
const uid=()=>crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(16).slice(2));
const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function loadState(){
  try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); if(x&&Array.isArray(x.songs)){state=x;return}}catch{}
  let oldSongs=[],oldSetlists=[]; try{oldSongs=JSON.parse(localStorage.getItem(LEGACY_SONGS)||'[]')||[];oldSetlists=JSON.parse(localStorage.getItem(LEGACY_SETLISTS)||'[]')||[]}catch{}
  state.songs=oldSongs.map((s,i)=>({id:s.id||uid(),title:s.title||`Música ${i+1}`,artist:s.artist||'',key:s.key||'',bpm:s.bpm||'',notes:s.notes||'',lyrics:s.lyrics||'',favorite:!!s.favorite,updatedAt:s.updatedAt||Date.now()-i}));
  state.setlists=oldSetlists.map((sl,i)=>({id:sl.id||uid(),name:sl.name||`Setlist ${i+1}`,songs:(sl.songs||[]).map(v=>typeof v==='number'?state.songs[v]?.id:v).filter(Boolean)}));
  saveState();
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function activeNav(id){['home','library','new','setlists'].forEach(n=>$('nav-'+n)?.classList.toggle('active',n===id))}
function hideViews(){document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));document.body.classList.remove('stage-mode')}
function showView(name){hideViews();$('view-'+name).classList.remove('hidden');closeMobileMenu();window.scrollTo({top:0});}
function goHome(){currentSetlistId=null;currentSetlistPos=null;showView('home');activeNav('home');renderHome()}
function showLibrary(){showView('library');activeNav('library');renderLibrary()}
function showSetlists(){showView('setlists');activeNav('setlists');renderSetlists()}
function renderHome(){
 const recent=[...state.songs].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,4), fav=state.songs.filter(s=>s.favorite).slice(0,4), last=recent[0];
 $('view-home').innerHTML=`<div class="hero"><span class="eyebrow">Sua central de cifras</span><h1>Toque com tudo à mão.</h1><p>Organize sua biblioteca, monte setlists e use o modo palco com navegação rápida entre músicas.</p><div class="hero-actions"><button class="primary-btn" onclick="showLibrary()">Abrir biblioteca</button><button class="ghost-btn" onclick="showSetlists()">Abrir setlists</button><button class="ghost-btn" onclick="openSongModal()">＋ Nova música</button></div></div>
 <div class="stats-grid"><div class="stat"><strong>${state.songs.length}</strong><span>Músicas</span></div><div class="stat"><strong>${state.setlists.length}</strong><span>Setlists</span></div><div class="stat"><strong>${state.songs.filter(s=>s.favorite).length}</strong><span>Favoritas</span></div><div class="stat"><strong>${last?esc(last.title):'—'}</strong><span>Última editada</span></div></div>
 ${homeSection('Recentes',recent)}${homeSection('Favoritas',fav,true)}`;
}
function homeSection(title,arr,isFav=false){return `<div class="section-block"><div class="section-title"><div><h2>${title}</h2><p>${arr.length?'Acesso rápido':'Nenhuma música por aqui ainda.'}</p></div>${isFav?'<button class="ghost-btn" onclick="showLibrary()">Ver biblioteca</button>':''}</div>${arr.length?`<div class="cards">${arr.map(songCard).join('')}</div>`:''}</div>`}
function songCard(s){return `<article class="song-card"><div class="card-top"><div><span class="eyebrow">${esc(s.artist||'Música')}</span><h3>${esc(s.title)}</h3></div><button class="star-btn ${s.favorite?'on':''}" onclick="toggleFavorite('${s.id}',event)" aria-label="Favoritar">★</button></div><div class="meta-line">${s.key?`<span class="badge">Tom ${esc(s.key)}</span>`:''}${s.bpm?`<span class="badge">${esc(s.bpm)} BPM</span>`:''}</div><div class="card-actions"><button class="ghost-btn" onclick="openSong('${s.id}')">Abrir</button><button class="ghost-btn" onclick="openSongModal('${s.id}')">Editar</button></div></article>`}
function renderLibrary(){
 $('view-library').innerHTML=`<div class="page-head"><div><span class="eyebrow">Biblioteca</span><h1>Suas músicas</h1><p>Pesquise, favorite e abra qualquer cifra.</p></div><button class="primary-btn" onclick="openSongModal()">＋ Nova música</button></div><div class="toolbar"><input id="library-search" class="search" placeholder="Pesquisar por título, artista ou tom..." oninput="filterLibrary()"><select id="library-filter" onchange="filterLibrary()"><option value="all">Todas</option><option value="fav">Favoritas</option></select></div><div id="library-grid" class="cards"></div>`; filterLibrary();
}
function filterLibrary(){const q=($('library-search')?.value||'').toLowerCase(),f=$('library-filter')?.value||'all';const arr=state.songs.filter(s=>(f!=='fav'||s.favorite)&&[s.title,s.artist,s.key].join(' ').toLowerCase().includes(q)).sort((a,b)=>a.title.localeCompare(b.title,'pt-BR'));$('library-grid').innerHTML=arr.length?arr.map(songCard).join(''):'<div class="empty-panel">Nenhuma música encontrada.</div>'}
function toggleFavorite(id,e){e?.stopPropagation();const s=state.songs.find(x=>x.id===id);if(!s)return;s.favorite=!s.favorite;s.updatedAt=Date.now();saveState();if(!$('view-library').classList.contains('hidden'))filterLibrary();if(!$('view-home').classList.contains('hidden'))renderHome()}
function renderSetlists(){
 const html=state.setlists.length?state.setlists.map(sl=>`<article class="setlist-card"><div class="card-top"><div><span class="eyebrow">Setlist</span><h3>${esc(sl.name)}</h3><span class="muted">${sl.songs.length} música(s)</span></div></div><div>${sl.songs.slice(0,5).map((id,i)=>{const s=state.songs.find(x=>x.id===id);return s?`<div class="setlist-song-row"><span>${i+1}. ${esc(s.title)}</span></div>`:''}).join('')+(sl.songs.length>5?`<div class="setlist-song-row muted"><span>+${sl.songs.length-5} mais</span></div>`:'')}</div><div class="card-actions"><button class="primary-btn" onclick="playSetlist('${sl.id}')">▶ Tocar</button><button class="ghost-btn" onclick="editSetlist('${sl.id}')">Editar</button></div></article>`).join(''):'<div class="empty-panel">Você ainda não criou nenhuma setlist.</div>';
 $('view-setlists').innerHTML=`<div class="page-head"><div><span class="eyebrow">Setlists</span><h1>Sequências para tocar</h1><p>Abra uma setlist e avance pelas músicas sem voltar para a biblioteca.</p></div><button class="primary-btn" onclick="createSetlist()">＋ Nova setlist</button></div><div class="cards">${html}</div>`;
}
function createSetlist(){const name=prompt('Nome da nova setlist:');if(!name)return;const sl={id:uid(),name,songs:[]};state.setlists.push(sl);saveState();editSetlist(sl.id)}
function editSetlist(id){
  const sl=state.setlists.find(x=>x.id===id);if(!sl)return;
  showView('setlists');activeNav('setlists');
  $('view-setlists').innerHTML=`<div class="page-head"><div><span class="eyebrow">Editar setlist</span><h1>${esc(sl.name)}</h1><p>Segure o ícone de arrastar à esquerda de cada música e leve até a posição que quiser. Essa é a ordem em que elas aparecem ao tocar.</p></div><div class="row-actions"><button class="primary-btn" onclick="playSetlist('${sl.id}')">▶ Tocar</button><button class="ghost-btn" onclick="showSetlists()">Concluir</button></div></div><div class="section-title"><div><h2>Ordem da setlist</h2><p id="sl-count"></p></div></div><div id="sl-order" class="sl-list"></div><div class="section-block"><div class="section-title"><div><h2>Adicionar músicas</h2><p>Toque em ＋ para colocar no fim da setlist.</p></div></div><div class="toolbar"><input id="sl-search" class="search" type="search" placeholder="Buscar na biblioteca…" oninput="slRenderAdd('${sl.id}')"></div><div id="sl-add" class="sl-list"></div></div>`;
  slRenderOrder(id);slRenderAdd(id);
}
const SL_GRIP='<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true"><circle cx="6" cy="4" r="1.7"/><circle cx="12" cy="4" r="1.7"/><circle cx="6" cy="9" r="1.7"/><circle cx="12" cy="9" r="1.7"/><circle cx="6" cy="14" r="1.7"/><circle cx="12" cy="14" r="1.7"/></svg>';
const slMeta=s=>{const n=Number.isInteger(s.transpose)?s.transpose:0,k=s.key?(n?`Tom ${transposeChord(s.key,n)} (orig. ${s.key})`:`Tom ${s.key}`):'';return esc([s.artist,k].filter(Boolean).join(' · '))};
function slRenderOrder(id){
  const sl=state.setlists.find(x=>x.id===id);if(!sl||!$('sl-order'))return;
  const rows=sl.songs.map(sid=>state.songs.find(x=>x.id===sid)).filter(Boolean);
  $('sl-count').textContent=`${rows.length} música(s)`;
  $('sl-order').innerHTML=rows.length?rows.map((s,i)=>`<div class="sl-row" data-id="${s.id}"><button type="button" class="sl-handle" aria-label="Arrastar para mudar a ordem" onpointerdown="slDragStart(event,'${sl.id}')">${SL_GRIP}</button><span class="sl-num">${i+1}</span><div class="sl-info"><strong>${esc(s.title)}</strong><small>${slMeta(s)}</small></div><button type="button" class="icon-btn sl-remove" aria-label="Remover da setlist" onclick="slRemove('${sl.id}','${s.id}')">✕</button></div>`).join(''):'<div class="empty-panel">Nenhuma música ainda. Adicione na lista abaixo.</div>';
}
function slRenderAdd(id){
  const sl=state.setlists.find(x=>x.id===id);if(!sl||!$('sl-add'))return;
  const q=($('sl-search')?.value||'').trim().toLowerCase();
  const rows=state.songs.filter(s=>!sl.songs.includes(s.id)&&(!q||`${s.title} ${s.artist||''}`.toLowerCase().includes(q)));
  $('sl-add').innerHTML=rows.length?rows.map(s=>`<div class="sl-row sl-add-row"><div class="sl-info"><strong>${esc(s.title)}</strong><small>${slMeta(s)}</small></div><button type="button" class="icon-btn sl-addbtn" aria-label="Adicionar à setlist" onclick="slAdd('${sl.id}','${s.id}')">＋</button></div>`).join(''):`<div class="empty-panel">${!state.songs.length?'Adicione músicas à biblioteca primeiro.':q?'Nenhuma música encontrada.':'Todas as músicas já estão nesta setlist.'}</div>`;
}
function slAdd(slId,songId){const sl=state.setlists.find(x=>x.id===slId);if(!sl||sl.songs.includes(songId))return;sl.songs.push(songId);saveState();slRenderOrder(slId);slRenderAdd(slId)}
function slRemove(slId,songId){const sl=state.setlists.find(x=>x.id===slId);if(!sl)return;sl.songs=sl.songs.filter(x=>x!==songId);saveState();slRenderOrder(slId);slRenderAdd(slId)}
// Arrastar e soltar (funciona com dedo no iPad/iPhone e com mouse): o item acompanha o dedo,
// os outros abrem espaço, e a tela rola sozinha quando você chega perto da borda.
function slDragStart(e,slId){
  if(e.button>0)return;
  e.preventDefault();
  const handle=e.currentTarget,row=handle.closest('.sl-row'),list=row.parentElement;
  try{handle.setPointerCapture(e.pointerId)}catch{}
  const startY=e.clientY,startTop=row.getBoundingClientRect().top;
  let lastY=startY,offset=0,raf=null,done=false;
  row.classList.add('dragging');
  const update=()=>{
    const desiredTop=startTop+(lastY-startY);
    row.style.transform='';
    let layoutTop=row.getBoundingClientRect().top;
    const center=desiredTop+row.offsetHeight/2;
    const sibs=[...list.children].filter(c=>c!==row);
    let ref=null;
    for(const s of sibs){const r=s.getBoundingClientRect();if(r.top+r.height/2>center){ref=s;break}}
    if(ref!==row.nextElementSibling){
      const before=new Map(sibs.map(s=>[s,s.getBoundingClientRect().top]));
      list.insertBefore(row,ref);
      sibs.forEach(s=>{const d=before.get(s)-s.getBoundingClientRect().top;if(d)s.animate([{transform:`translateY(${d}px)`},{transform:'none'}],{duration:150,easing:'ease-out'})});
      [...list.children].forEach((c,i)=>{const n=c.querySelector('.sl-num');if(n)n.textContent=i+1});
      layoutTop=row.getBoundingClientRect().top;
    }
    offset=desiredTop-layoutTop;
    row.style.transform=`translateY(${offset}px)`;
  };
  const tick=()=>{
    if(done)return;
    const h=window.innerHeight,edge=90;
    if(lastY<edge)window.scrollBy(0,-(4+(edge-lastY)/5));
    else if(lastY>h-edge)window.scrollBy(0,4+(lastY-(h-edge))/5);
    update();raf=requestAnimationFrame(tick);
  };
  const move=ev=>{lastY=ev.clientY};
  const end=()=>{
    if(done)return;done=true;cancelAnimationFrame(raf);
    handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);
    row.classList.remove('dragging');row.style.transform='';
    if(offset)row.animate([{transform:`translateY(${offset}px)`},{transform:'none'}],{duration:140,easing:'ease-out'});
    const sl=state.setlists.find(x=>x.id===slId);
    if(sl){sl.songs=[...list.children].map(c=>c.dataset.id).filter(Boolean);saveState()}
  };
  handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
  tick();
}
function playSetlist(id){const sl=state.setlists.find(x=>x.id===id);if(!sl||!sl.songs.length)return toast('Essa setlist está vazia.');currentSetlistId=id;currentSetlistPos=0;openSong(sl.songs[0],{preserveSetlist:true})}
function openSong(id,opt={}){const s=state.songs.find(x=>x.id===id);if(!s)return;if(!opt.preserveSetlist){currentSetlistId=null;currentSetlistPos=null}currentSongId=id;currentTranspose=songTranspose(id);showView('song');activeNav(currentSetlistId?'setlists':'library');renderSong();}
function renderSong(){
  const s=state.songs.find(x=>x.id===currentSongId);if(!s)return;
  const sl=currentSetlistId?state.setlists.find(x=>x.id===currentSetlistId):null;
  let setNav='',stageNav='';
  if(sl){
    const atFirst=currentSetlistPos<=0,atLast=currentSetlistPos>=sl.songs.length-1;
    setNav=`<div class="song-navstrip"><button class="pill-btn" onclick="prevSetlistSong()" ${atFirst?'disabled':''}>← Anterior</button><div class="song-context"><strong>${esc(sl.name)}</strong>${currentSetlistPos+1} de ${sl.songs.length}</div><button class="pill-btn" onclick="nextSetlistSong()" ${atLast?'disabled':''}>Próxima →</button></div>`;
    stageNav=`<div class="stage-group"><button class="pill-btn" onclick="prevSetlistSong()" ${atFirst?'disabled':''} aria-label="Música anterior">‹</button><span class="stage-pos">${currentSetlistPos+1}/${sl.songs.length}</span><button class="pill-btn" onclick="nextSetlistSong()" ${atLast?'disabled':''} aria-label="Próxima música">›</button></div>`;
  }
  $('view-song').innerHTML=`<div class="stage-bar">${stageNav}<div class="stage-group"><button class="pill-btn" onclick="transpose(-1)" aria-label="Abaixar o tom">♭</button><button class="pill-btn tr-val" onclick="resetTranspose()" title="Voltar ao tom original">0</button><button class="pill-btn" onclick="transpose(1)" aria-label="Subir o tom">♯</button></div><div class="stage-group"><button class="pill-btn" onclick="changeFont(-2)" aria-label="Diminuir a letra">A−</button><button class="pill-btn" onclick="changeFont(2)" aria-label="Aumentar a letra">A＋</button></div><button class="primary-btn stage-exit" onclick="toggleStageMode()">✕ Sair</button></div><div class="song-view">${setNav}<div class="song-topline"><div><span class="eyebrow">${esc(s.artist||'Música')}</span><h1 class="song-title">${esc(s.title)}</h1><div class="song-sub">${s.key?`Tom <strong id="display-key">${esc(transposedKey(s.key))}</strong>`:''}${s.bpm?` · ${esc(s.bpm)} BPM`:''}</div></div><button class="star-btn ${s.favorite?'on':''}" onclick="toggleFavorite('${s.id}',event)">★</button></div>${s.notes?`<div class="notes-box">${esc(s.notes)}</div>`:''}<div id="stage-toolbar" class="stage-toolbar"><div class="stage-actions"><button class="pill-btn" onclick="transpose(-1)">♭ Tom</button><button class="pill-btn tr-val" onclick="resetTranspose()" title="Voltar ao tom original">0</button><button class="pill-btn" onclick="transpose(1)">♯ Tom</button><button class="pill-btn" onclick="changeFont(-2)">A−</button><button class="pill-btn" onclick="changeFont(2)">A＋</button></div><div class="stage-actions"><button class="pill-btn" onclick="openSongModal('${s.id}')">✎ Editar</button><button class="primary-btn" onclick="toggleStageMode()">Modo palco</button></div></div><div id="lyrics" class="lyrics" style="font-size:${fontSize}px">${renderLyrics(s.lyrics)}</div></div>`;
  updateTransposeUI();
}
function transposeNote(note,amount){const flat=note?.[1]==='b',n=flatToSharp[note]||note,i=notes.indexOf(n);if(i<0)return note;const r=notes[(i+amount+120)%12];return flat&&sharpToFlat[r]?sharpToFlat[r]:r}
function transposeChord(chord,amount){const m=String(chord).match(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/);if(!m)return chord;return transposeNote(m[1],amount)+(m[2]||'')+(m[3]?'/'+transposeNote(m[3],amount):'')}
function transposedKey(k){return transposeChord(k,currentTranspose)}
/* ===== Reconhecimento de cifras =====
   Aceita 3 formas, que podem ser misturadas na mesma música:
   1) ChordPro:  Ainda [F]que pra te ser[F/G]vir        (acorde logo antes da sílaba)
   2) Cifra Club: linha de acordes + linha da letra logo abaixo (colar direto)
   3) Linha só de acordes (intro/solo), com ou sem rótulo: "Intro: Em D C" ou "[Em] [D]" */
const CHORD_QUAL=['maj13','maj11','maj9','maj7','maj','M13','M11','M9','M7','7M','9M','m7b5','m7#5','mM7','min7','min','dim7','dim','aug','sus2','sus4','sus','add9','add11','add13','add2','add4','add','6/9','7/9','m7/9','m6','m7','m9','m11','m13','m','13','11','9','7','6','5','4','2','°7','°','ø7','ø','º','+5','+','-5','-','Δ'].sort((a,b)=>b.length-a.length).map(q=>q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
const CHORD_STRICT=new RegExp('^[A-G](?:#|b)?(?:'+CHORD_QUAL+'|[#b](?:5|9|11|13))*(?:\\([^()]*\\))*(?:\\/[A-G](?:#|b)?)?$');
const MARKER=/^(?:\(?(?:\d+x|x\d+)\)?|\|+)$/i;
// Estrito: usado pra decidir se uma linha INTEIRA é de acordes (evita confundir com letra).
const isChord=t=>t.length<=24&&CHORD_STRICT.test(t);
// Mais flexível: usado dentro de [colchetes], onde a intenção de escrever um acorde é explícita.
function isExplicitChord(t){
  if(isChord(t))return true;
  const m=t.match(/^[A-G](?:#|b)?(.*)$/);
  if(!m||t.length>24||!/^[A-Za-z0-9#b°ø+\-()\/,Δº.]*$/.test(m[1]))return false;
  return (m[1].match(/[a-z]{3,}/g)||[]).every(r=>/^(?:maj|min|dim|aug|sus|add)+$/.test(r));
}
function chordItems(str){
  const toks=str.match(/\[[^\]]*\]|\S+/g)||[],items=[];
  for(const tk of toks){
    if(tk[0]==='['&&tk.endsWith(']')){const inner=tk.slice(1,-1).trim();if(isExplicitChord(inner))items.push({chord:inner});else return null}
    else if(isChord(tk))items.push({chord:tk});
    else if(MARKER.test(tk))items.push({mark:tk});
    else return null;
  }
  return items.some(i=>i.chord)?items:null;
}
function parseUnits(line){
  const units=[{chord:null,text:''}],re=/\[([^\]]+)\]/g;let last=0,m;
  while((m=re.exec(line))){
    const inner=m[1].trim();
    units[units.length-1].text+=line.slice(last,m.index);
    if(isExplicitChord(inner))units.push({chord:inner,text:''});else units[units.length-1].text+=m[0];
    last=m.index+m[0].length;
  }
  units[units.length-1].text+=line.slice(last);
  if(!units[0].chord&&!units[0].text)units.shift();
  return units;
}
function classify(raw){
  const line=String(raw).replace(/\t/g,'    ').replace(/\u00a0/g,' ').replace(/\s+$/,'');
  if(!line.trim())return {type:'empty'};
  const km=line.trim().replace(/^[\[(]\s*|\s*[\])]$/g,'').match(/^(?:tom|tonalidade|key|modula(?:ç|c)[ãa]o(?:\s+para)?|modula\s+para)\s*[:\-–]?\s*(\S+)$/i);
  if(km&&isChord(km[1]))return {type:'key',chord:km[1]};
  let label=null,rest=line;
  const lm=line.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
  if(lm&&!isExplicitChord(lm[1].trim())){label=lm[1].trim();rest=lm[2].replace(/^:\s*/,'')}
  else{const cm=line.match(/^\s*([^\[\]:]{1,24}):\s*(.+)$/);if(cm&&chordItems(cm[2])){label=cm[1].trim();rest=cm[2]}}
  if(label!==null){
    if(!rest.trim())return {type:'label',label};
    const items=chordItems(rest);
    return items?{type:'instr',label,items}:{type:'text',line};
  }
  const items=chordItems(line);
  if(items)return line.includes('[')?{type:'instr',items}:{type:'bare',line,items};
  if(/\[[^\]]+\]/.test(line)){const units=parseUnits(line);if(units.some(u=>u.chord))return {type:'pro',units}}
  return {type:'text',line};
}
// Cifra Club: coloca cada acorde da linha de cima na MESMA coluna da letra de baixo.
function mergeChordLine(chordLine,lyric){
  const toks=[...chordLine.matchAll(/\S+/g)].filter(m=>isChord(m[0])).map(m=>({chord:m[0],col:m.index}));
  let text=lyric,out='',pos=0,trailing=false;
  toks.forEach((tk,i)=>{
    let col=tk.col;
    if(col>=text.length){
      if(!trailing){if(text.length&&!/\s$/.test(text))text+=' ';trailing=true}
      col=text.length;
    }else if(/\s/.test(text[col])){
      // acorde caiu num espaço colado na palavra: alinha com o início da próxima palavra
      let k=col;while(k<text.length&&/\s/.test(text[k]))k++;
      if(k<text.length&&k-col<=2)col=k;
    }
    const next=toks[i+1];
    if(next&&col>next.col)col=next.col;
    col=Math.max(col,pos);
    out+=text.slice(pos,col)+'['+tk.chord+']';pos=col;
  });
  return out+text.slice(pos);
}
function proHtml(units){
  let html='',group='';
  const flush=()=>{if(group){html+=`<span class="word">${group}</span>`;group=''}};
  const seg=(ch,tx)=>`<span class="chord-segment"><span class="chord-tag${ch?'':' empty'}">${ch?esc(transposeChord(ch,currentTranspose)):'&nbsp;'}</span><span class="segment-text">${esc(tx)}</span></span>`;
  units.forEach((u,ui)=>{
    const parts=u.text.split(/(\s+)/).filter(p=>p!=='');
    let pending=u.chord||null;
    if(!parts.length){if(pending)group+=seg(pending,'\u00a0')}
    else for(const p of parts){
      if(/^\s+$/.test(p)){
        flush();
        if(pending){html+=seg(pending,p);pending=null}else html+=`<span class="lyric-plain">${esc(p)}</span>`;
      }else{group+=seg(pending,p);pending=null}
    }
    // A fonte da cifra é monoespaçada: dá pra medir em caracteres. Se o nome do acorde não cabe
    // no trecho até o próximo acorde, acrescenta só o espaço que falta (evita acordes sobrepostos).
    if(u.chord&&ui<units.length-1){
      const need=transposeChord(u.chord,currentTranspose).length*0.84+0.7,room=Math.max(u.text.length,1),extra=need-room;
      if(extra>0){const sp=`<span class="chord-room" style="width:${extra.toFixed(2)}ch"></span>`;if(group)group+=sp;else html+=sp}
    }
  });
  flush();
  return `<div class="lyric-line has-chord">${html}</div>`;
}
function instrHtml(k){
  const lab=k.label?`<span class="inst-label">${esc(k.label)}</span>`:'';
  return `<div class="lyric-line instrumental-line">${lab}${k.items.map(i=>i.chord?`<span class="instrumental-chord">${esc(transposeChord(i.chord,currentTranspose))}</span>`:`<span class="inst-mark">${esc(i.mark)}</span>`).join('')}</div>`;
}
function renderLyrics(text=''){
  const kinds=String(text).split(/\r?\n/).map(classify),out=[];
  for(let i=0;i<kinds.length;i++){
    const k=kinds[i];
    if(k.type==='empty')out.push('<div class="lyric-line empty-line">&nbsp;</div>');
    else if(k.type==='label')out.push(`<div class="lyric-line section-label">${esc(k.label)}</div>`);
    else if(k.type==='instr')out.push(instrHtml(k));
    else if(k.type==='key')out.push(`<div class="lyric-line key-marker"><span>Tom</span><strong>${esc(transposeChord(k.chord,currentTranspose))}</strong></div>`);
    else if(k.type==='bare'){
      const nx=kinds[i+1];
      if(nx&&nx.type==='text'){out.push(proHtml(parseUnits(mergeChordLine(k.line,nx.line))));i++}
      else out.push(instrHtml(k));
    }
    else if(k.type==='pro')out.push(proHtml(k.units));
    else out.push(`<div class="lyric-line">${esc(k.line)}</div>`);
  }
  return out.join('');
}
function updateTransposeUI(){
  const t=currentTranspose,off=t===0?'original':(t>0?'+':'')+t;
  const s=state.songs.find(x=>x.id===currentSongId),key=s&&s.key?transposedKey(s.key):'';
  document.querySelectorAll('.tr-val').forEach(b=>{
    b.innerHTML=key?`<span class="tr-key">${esc(key)}</span><small>${off}</small>`:(t===0?'0':off);
    b.classList.toggle('on',t!==0);
  });
}
function refreshSong(){
  const s=state.songs.find(x=>x.id===currentSongId);if(!s)return;
  const l=$('lyrics');if(l)l.innerHTML=renderLyrics(s.lyrics);
  const k=$('display-key');if(k&&s.key)k.textContent=transposedKey(s.key);
  updateTransposeUI();
}
// O tom escolhido fica salvo na própria música: vale em qualquer setlist, na biblioteca e depois de fechar o app.
// "original" (0) apaga o campo. O campo "Tom" da música continua sendo o tom original.
function songTranspose(id){const s=state.songs.find(x=>x.id===id);return s&&Number.isInteger(s.transpose)?s.transpose:0}
function setSongTranspose(n){currentTranspose=n;const s=state.songs.find(x=>x.id===currentSongId);if(s){if(n)s.transpose=n;else delete s.transpose;saveState()}refreshSong()}
function transpose(a){let n=currentTranspose+a;if(n>6)n-=12;if(n<-5)n+=12;setSongTranspose(n)}
function resetTranspose(){setSongTranspose(0)}
function changeFont(a){fontSize=Math.max(12,Math.min(42,fontSize+a));const l=$('lyrics');if(l)l.style.fontSize=fontSize+'px'}
function toggleStageMode(){
  document.body.classList.toggle('stage-mode');
  (document.scrollingElement||document.documentElement).scrollTop=0;
}
function nextSetlistSong(){const sl=state.setlists.find(x=>x.id===currentSetlistId);if(!sl||currentSetlistPos>=sl.songs.length-1)return;currentSetlistPos++;currentSongId=sl.songs[currentSetlistPos];currentTranspose=songTranspose(currentSongId);window.scrollTo({top:0});renderSong()}
function prevSetlistSong(){const sl=state.setlists.find(x=>x.id===currentSetlistId);if(!sl||currentSetlistPos<=0)return;currentSetlistPos--;currentSongId=sl.songs[currentSetlistPos];currentTranspose=songTranspose(currentSongId);window.scrollTo({top:0});renderSong()}
function openSongModal(id=null){editingSongId=id;const s=id?state.songs.find(x=>x.id===id):null;$('modal-title').textContent=s?'Editar música':'Nova música';$('f-title').value=s?.title||'';$('f-artist').value=s?.artist||'';$('f-key').value=s?.key||'';$('f-bpm').value=s?.bpm||'';$('f-notes').value=s?.notes||'';$('f-lyrics').value=s?.lyrics||'';$('f-favorite').checked=!!s?.favorite;$('modal-backdrop').classList.remove('hidden');setTimeout(()=>$('f-title').focus(),20)}
function closeSongModal(){$('modal-backdrop').classList.add('hidden');editingSongId=null}
function closeModalFromBackdrop(e){if(e.target.id==='modal-backdrop')closeSongModal()}
function saveSong(e){e.preventDefault();const data={title:$('f-title').value.trim(),artist:$('f-artist').value.trim(),key:$('f-key').value.trim(),bpm:$('f-bpm').value.trim(),notes:$('f-notes').value.trim(),lyrics:$('f-lyrics').value,favorite:$('f-favorite').checked,updatedAt:Date.now()};if(editingSongId){const i=state.songs.findIndex(x=>x.id===editingSongId);state.songs[i]={...state.songs[i],...data};currentSongId=editingSongId}else{const s={id:uid(),...data};state.songs.push(s);currentSongId=s.id}saveState();closeSongModal();openSong(currentSongId);toast('Música salva.')}
function triggerImport(){$('import-file').click()}
$('import-file').addEventListener('change',async e=>{for(const f of e.target.files){await importOne(f)}e.target.value='';saveState();toast('Importação concluída.');if(!$('view-library').classList.contains('hidden'))renderLibrary();else renderHome()})
async function importOne(file){const ext=file.name.split('.').pop().toLowerCase();if(ext==='json'){try{const j=JSON.parse(await file.text());if(Array.isArray(j.songs)){for(const s of j.songs)state.songs.push({...s,id:s.id||uid(),updatedAt:Date.now()});if(Array.isArray(j.setlists))for(const sl of j.setlists)state.setlists.push({...sl,id:sl.id||uid()})}else if(j.title)state.songs.push({...j,id:j.id||uid(),updatedAt:Date.now()})}catch{toast('JSON inválido: '+file.name)}return}let text='';if(ext==='docx'){if(!window.mammoth){toast('Para DOCX é necessário estar online.');return}const r=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});text=r.value}else{text=await file.text()}const lines=text.split(/\r?\n/),title=(lines.find(x=>x.trim())||file.name.replace(/\.[^.]+$/,'')).trim();state.songs.push({id:uid(),title,artist:'',key:'',bpm:'',notes:'',lyrics:text,favorite:false,updatedAt:Date.now()})}
function exportLibrary(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='chord-live-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function toggleMobileMenu(){$('sidebar').classList.toggle('open');$('mobile-overlay').classList.toggle('open')}
function closeMobileMenu(){$('sidebar').classList.remove('open');$('mobile-overlay').classList.remove('open')}
function toast(msg){document.querySelector('.toast')?.remove();const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1800)}
let touchX=null,touchY=null;
document.addEventListener('touchstart',e=>{
  if($('view-song').classList.contains('hidden'))return;
  touchX=e.changedTouches[0].clientX;touchY=e.changedTouches[0].clientY;
},{passive:true});
document.addEventListener('touchend',e=>{
  if(touchX===null)return;
  const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;
  touchX=null;touchY=null;
  const need=document.body.classList.contains('stage-mode')?110:70; // no palco, exige gesto mais firme
  if(currentSetlistId&&Math.abs(dx)>need&&Math.abs(dx)>Math.abs(dy)*1.25&&!e.target.closest?.('.stage-bar,textarea,input,select'))dx<0?nextSetlistSong():prevSetlistSong();
},{passive:true});
document.addEventListener('keydown',e=>{
  if($('modal-backdrop')&&!$('modal-backdrop').classList.contains('hidden'))return;
  if(e.key==='Escape'&&document.body.classList.contains('stage-mode')){document.body.classList.remove('stage-mode');return}
  if(!$('view-song').classList.contains('hidden')&&currentSetlistId){
    if(['ArrowRight','PageDown'].includes(e.key)){e.preventDefault();nextSetlistSong()}
    if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();prevSetlistSong()}
  }
});
loadState();goHome();
