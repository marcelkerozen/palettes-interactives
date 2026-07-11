// ===== Palettes interactives — app =====
const N = 16;
const PALETTE = ['#5dcaa5','#378add','#ef9f27','#d4537e','#7f77dd','#e24b4a','#ffffff','#1d9e75','#d85a30'];
const FX_NAMES = ['Néon','Braise','Lagon','Prisme','Comète','Aurore','Pulsar','Récif','Mirage','Éclat','Halo','Onde'];

let effects = [
  {id:1, name:'Contour vert',     type:'contour', colors:['#5dcaa5'], speed:5, brightness:80},
  {id:2, name:'Pulsation bleue',  type:'pulse',   colors:['#378add'], speed:5, brightness:85},
  {id:3, name:'Arc-en-ciel',      type:'rainbow', colors:['#ffffff'], speed:6, brightness:80},
  {id:4, name:'Remplissage ambre',type:'fill',    colors:['#ef9f27'], speed:4, brightness:70},
];
let nextFxId = 5;

let pallets = [
  {id:1, name:'Palette 1', cups:new Set([{r:7,c:8}]), effectId:1, pos:{x:40,y:60}},
  {id:2, name:'Palette 2', cups:new Set(),            effectId:2, pos:{x:190,y:60}},
  {id:3, name:'Palette 3', cups:new Set([{r:5,c:5},{r:9,c:10}]), effectId:3, pos:{x:340,y:60}},
];
let nextPalId = 4;

// effet joué par une palette quand rien n'est posé dessus (repos)
const REST_TYPES = [
  {id:'off',     name:'Éteint'},
  {id:'breath',  name:'Respiration'},
  {id:'wave',    name:'Vague lente'},
  {id:'sparkle', name:'Scintillement'}
];
let restFx = { type:'breath', color:'#1d9e75', speed:3, brightness:32 };

let ui = { view:'overview', ovSub:'cards', activePal:1, editing:null, t:0 };

// ---------- helpers détection / rendu ----------
function effById(id){ return effects.find(e=>e.id===id) || effects[0]; }
function palById(id){ return pallets.find(p=>p.id===id); }
function rnd(a){ return a[Math.floor(Math.random()*a.length)]; }

function footprint(p){
  const set=new Set();
  for(const cup of p.cups){
    for(let dr=-3;dr<=3;dr++)for(let dc=-3;dc<=3;dc++){
      const rr=cup.r+dr, cc=cup.c+dc;
      if(rr<0||cc<0||rr>=N||cc>=N)continue;
      if(Math.hypot(dr,dc)<=2.4) set.add(rr*N+cc);
    }
  }
  return set;
}
function contourOf(fp){
  const edge=new Set();
  for(const i of fp){
    const r=Math.floor(i/N),c=i%N;
    const nb=[[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
    if(nb.some(([rr,cc])=>rr<0||cc<0||rr>=N||cc>=N||!fp.has(rr*N+cc))) edge.add(i);
  }
  return edge;
}
// style d'une cellule pour un effet donné
function cellStyle(i, fp, edge, eff, t){
  const onEdge=edge.has(i), inFill=fp.has(i);
  const sp=eff.speed||5;
  let lit=false, col=(eff.colors&&eff.colors[0])||'#5dcaa5', op=(eff.brightness||80)/100;
  switch(eff.type){
    case 'fill':    lit=inFill; break;
    case 'contour': lit=onEdge; break;
    case 'pulse':   lit=onEdge; op*=0.45+0.55*Math.abs(Math.sin(t*sp/60)); break;
    case 'rainbow': if(onEdge){lit=true; const h=(t*sp + (i%N)*14 + Math.floor(i/N)*14)%360; col=`hsl(${h},70%,60%)`;} break;
    case 'chase':   if(onEdge){lit=true; const w=0.5+0.5*Math.sin(i*0.6 - t*sp/10); op*=0.12+0.88*w;} break;
    default:        lit=onEdge;
  }
  if(lit && eff.colors && eff.colors.length>1 && eff.type!=='rainbow'){
    col = eff.colors[i % eff.colors.length];
  }
  return lit ? {col, op:Math.max(0.12,Math.min(1,op))} : null;
}
// construit une grille NxN de cellules dans un conteneur
function buildGrid(container, cellPx, clickable){
  container.innerHTML='';
  container.style.gridTemplateColumns=`repeat(${N},${cellPx}px)`;
  container.style.gap = cellPx>=16 ? '3px' : '2px';
  const cells=[];
  for(let i=0;i<N*N;i++){
    const c=document.createElement('div');
    c.className='cell';
    c.style.width=cellPx+'px'; c.style.height=cellPx+'px';
    c.style.borderRadius = cellPx>=16?'4px':'2px';
    if(clickable){ const idx=i; c.style.cursor='pointer'; c.addEventListener('click',()=>placeCup(idx)); }
    else { c.style.cursor='default'; }
    container.appendChild(c); cells.push(c);
  }
  return cells;
}
// effet de repos (rien posé) : anime toute la grille
function restCellStyle(i,t,rf){
  if(rf.type==='off') return null;
  const sp=rf.speed||3; let op=(rf.brightness||32)/100; const col=rf.color||'#1d9e75';
  const r=Math.floor(i/N),c=i%N;
  if(rf.type==='breath'){ op*=0.3+0.7*(0.5+0.5*Math.sin(t*sp/40)); }
  else if(rf.type==='wave'){ op*=0.15+0.85*(0.5+0.5*Math.sin((c+r)*0.4 - t*sp/25)); }
  else if(rf.type==='sparkle'){ const s=Math.sin(i*12.9898+Math.floor(t*sp/22)*78.233)*43758.5453; const f=s-Math.floor(s); op*= f>0.86?f:0.05; }
  return {col, op:Math.max(0.04,Math.min(1,op))};
}
function applyCell(el,s){
  if(s){ el.style.background=s.col; el.style.opacity=(0.3+0.7*s.op); el.style.boxShadow=`0 0 ${5*s.op}px ${s.col}`; }
  else { el.style.background=''; el.style.opacity=1; el.style.boxShadow=''; }
}
function paint(cells, pal, eff, t){
  const empty = pal.cups.size===0;
  const fp=footprint(pal), edge=contourOf(fp);
  cells.forEach((el,i)=>{
    el.classList.toggle('cup', fp.has(i));
    applyCell(el, empty ? restCellStyle(i,t,restFx) : cellStyle(i,fp,edge,eff,t));
  });
}
// rendu spatial d'un effet global sur une palette selon sa position dans le plan
function paintGlobalSpatial(cells, pal, t){
  const wx0=pal.pos.x/7, wy0=pal.pos.y/7;
  cells.forEach((el,i)=>{
    const r=Math.floor(i/N),c=i%N;
    el.classList.remove('cup');
    applyCell(el, globalCellStyle(wx0+c, wy0+r, t, globalFx));
  });
}

// ---------- navigation ----------
function setView(v){
  ui.view=v;
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  document.querySelectorAll('.view').forEach(s=>s.classList.toggle('on', s.id==='view-'+v));
  if(v==='overview') renderOverview();
  if(v==='console')  renderConsole();
  if(v==='effects')  renderEffects();
  if(v==='global')   renderGlobal();
}
document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));

// ---------- vue d'ensemble ----------
let ovCells = {};    // palId -> cells (cartes)
let planCells = {};  // palId -> cells (plan 2D)

function renderOverview(){
  document.getElementById('ovInfo').textContent = `${pallets.length} palette${pallets.length>1?'s':''} · bus RS485`;
  setOvSub(ui.ovSub);
}
function setOvSub(sub){
  ui.ovSub=sub;
  document.querySelectorAll('.subtabs button').forEach(b=>b.classList.toggle('on',b.dataset.sub===sub));
  document.getElementById('ovCards').hidden = sub!=='cards';
  document.getElementById('ovPlan').hidden = sub!=='plan';
  if(sub==='cards') renderCards();
  if(sub==='plan')  renderPlan();
}
document.querySelectorAll('.subtabs button').forEach(b=>b.addEventListener('click',()=>setOvSub(b.dataset.sub)));

function renderCards(){
  const wrap=document.getElementById('ovGrid');
  wrap.innerHTML=''; ovCells={};
  pallets.forEach(p=>{
    const card=document.createElement('div');
    card.className='ov-card';
    card.addEventListener('click',()=>{ ui.activePal=p.id; setView('console'); });
    const eff=effById(p.effectId);
    card.innerHTML =
      `<div class="top"><span class="nm">${p.name}</span><span class="dot"></span></div>
       <div class="mini"></div>
       <div class="meta"><span>${p.cups.size} cup${p.cups.size>1?'s':''}</span><span class="fxname">${eff.name}</span></div>`;
    wrap.appendChild(card);
    ovCells[p.id]=buildGrid(card.querySelector('.mini'), 9, false);
  });
}
function renderPlan(){
  const area=document.getElementById('planArea');
  area.innerHTML=''; planCells={};
  pallets.forEach(p=>{
    const el=document.createElement('div');
    el.className='plan-pal';
    el.style.left=p.pos.x+'px'; el.style.top=p.pos.y+'px';
    const g=document.createElement('div'); g.className='p-grid';
    const nm=document.createElement('div'); nm.className='p-name'; nm.textContent=p.name;
    el.appendChild(g); el.appendChild(nm); area.appendChild(el);
    planCells[p.id]=buildGrid(g,7,false);
    el.addEventListener('mousedown',e=>{
      planDrag={p,el,sx:e.clientX,sy:e.clientY,ox:p.pos.x,oy:p.pos.y,area};
      el.classList.add('drag'); e.preventDefault();
    });
  });
}
let planDrag=null;
document.addEventListener('mousemove',e=>{
  if(!planDrag) return;
  const {p,el,sx,sy,ox,oy,area}=planDrag;
  let nx=ox+(e.clientX-sx), ny=oy+(e.clientY-sy);
  nx=Math.max(0,Math.min(area.clientWidth-122, nx));
  ny=Math.max(0,Math.min(area.clientHeight-122, ny));
  p.pos.x=nx; p.pos.y=ny; el.style.left=nx+'px'; el.style.top=ny+'px';
});
document.addEventListener('mouseup',()=>{ if(planDrag){ planDrag.el.classList.remove('drag'); planDrag=null; } });

// ---------- console ----------
let consoleCells = null;
function renderConsole(){
  if(!palById(ui.activePal) && pallets[0]) ui.activePal=pallets[0].id;
  // liste palettes
  const list=document.getElementById('palList'); list.innerHTML='';
  pallets.forEach(p=>{
    const d=document.createElement('div');
    d.className='pal'+(p.id===ui.activePal?' active':'');
    d.innerHTML=`<span class="dot"></span><span class="nm">${p.name}</span><span class="st">${p.cups.size} cup</span><span class="x" title="retirer">✕</span>`;
    d.addEventListener('click',e=>{
      if(e.target.classList.contains('x')){ removePal(p.id); e.stopPropagation(); return; }
      ui.activePal=p.id; renderConsole();
    });
    list.appendChild(d);
  });
  // selecteur d'effet
  const sel=document.getElementById('palEffect'); sel.innerHTML='';
  effects.forEach(e=>{ const o=document.createElement('option'); o.value=e.id; o.textContent=e.name; sel.appendChild(o); });
  const cur=palById(ui.activePal);
  sel.value = cur? cur.effectId : effects[0].id;
  // grille
  consoleCells = buildGrid(document.getElementById('grid'), 20, true);
  updateConsoleLabels();
}
function updateConsoleLabels(){
  const p=palById(ui.activePal); if(!p) return;
  document.getElementById('stageName').textContent=p.name;
  const nc=p.cups.size;
  document.getElementById('stageState').textContent = nc? `${nc} eco cup${nc>1?'s':''} détecté${nc>1?'s':''}` : 'clique pour poser un eco cup';
  const n=pallets.length;
  document.getElementById('busTxt').textContent = `Bus RS485 · ${n} palette${n>1?'s':''} en ligne`;
}
function placeCup(idx){
  const p=palById(ui.activePal); if(!p) return;
  const r=Math.floor(idx/N), c=idx%N;
  let removed=false;
  for(const cup of p.cups){ if(Math.hypot(cup.r-r,cup.c-c)<2.6){ p.cups.delete(cup); removed=true; break; } }
  if(!removed) p.cups.add({r,c});
  updateConsoleLabels();
}
function addPal(){
  const id=nextPalId++;
  pallets.push({id,name:'Palette '+id,cups:new Set(),effectId:effects[0].id});
  ui.activePal=id; renderConsole();
}
function removePal(id){
  pallets=pallets.filter(p=>p.id!==id);
  if(ui.activePal===id && pallets[0]) ui.activePal=pallets[0].id;
  renderConsole();
}
document.getElementById('addPal').addEventListener('click',addPal);
document.getElementById('palEffect').addEventListener('change',e=>{
  const p=palById(ui.activePal); if(p) p.effectId=+e.target.value;
});
let _applyMsgTimer=null;
document.getElementById('applyAll').addEventListener('click',()=>{
  const p=palById(ui.activePal); if(!p) return;
  const eff=effById(p.effectId);
  pallets.forEach(x=>x.effectId=p.effectId);
  const m=document.getElementById('applyMsg');
  m.textContent=`Effet « ${eff.name} » appliqué à ${pallets.length} palette${pallets.length>1?'s':''}`;
  m.classList.add('show');
  clearTimeout(_applyMsgTimer);
  _applyMsgTimer=setTimeout(()=>{ m.classList.remove('show'); m.textContent=''; }, 2800);
});

// ---------- effet de repos ----------
function renderRestControls(){
  const sel=document.getElementById('restType'); sel.innerHTML='';
  REST_TYPES.forEach(rt=>{ const o=document.createElement('option'); o.value=rt.id; o.textContent=rt.name; sel.appendChild(o); });
  sel.value=restFx.type;
  document.getElementById('restColor').value=restFx.color;
  document.getElementById('restSpeed').value=restFx.speed;
  document.getElementById('restBright').value=restFx.brightness;
}
document.getElementById('restType').addEventListener('change',e=>{ restFx.type=e.target.value; });
document.getElementById('restColor').addEventListener('input',e=>{ restFx.color=e.target.value; });
document.getElementById('restSpeed').addEventListener('input',e=>{ restFx.speed=+e.target.value; });
document.getElementById('restBright').addEventListener('input',e=>{ restFx.brightness=+e.target.value; });

// ---------- effets : liste + CRUD ----------
function renderEffects(){
  renderRestControls();
  const wrap=document.getElementById('fxList'); wrap.innerHTML='';
  effects.forEach(e=>{
    const used=pallets.filter(p=>p.effectId===e.id).length;
    const card=document.createElement('div'); card.className='fx-card';
    const sw=e.type==='rainbow' ? `<div class="sw" style="background:linear-gradient(90deg,red,orange,yellow,green,blue,violet)"></div>`
      : e.colors.map(c=>`<div class="sw" style="background:${c}"></div>`).join('');
    card.innerHTML=
      `<div class="top"><span class="nm">${e.name}</span><span class="badge">${typeLabel(e.type)}</span></div>
       <div class="sw-row">${sw}</div>
       <div class="used">${used?`utilisé par ${used} palette${used>1?'s':''}`:'non assigné'} · vitesse ${e.speed} · lum. ${e.brightness}%</div>
       <div class="acts"><button class="btn tiny" data-edit="${e.id}">Modifier</button><button class="btn tiny" data-del="${e.id}">Supprimer</button></div>`;
    wrap.appendChild(card);
  });
  wrap.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(+b.dataset.edit)));
  wrap.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>deleteEffect(+b.dataset.del)));
}
function typeLabel(t){ return {contour:'Contour',fill:'Remplissage',pulse:'Pulsation',rainbow:'Arc-en-ciel',chase:'Poursuite'}[t]||t; }

function deleteEffect(id){
  if(effects.length<=1){ alert('Il faut au moins un effet.'); return; }
  const used=pallets.filter(p=>p.effectId===id).length;
  if(used && !confirm(`Cet effet est utilisé par ${used} palette(s). Elles basculeront sur un autre effet. Supprimer ?`)) return;
  effects=effects.filter(e=>e.id!==id);
  pallets.forEach(p=>{ if(p.effectId===id) p.effectId=effects[0].id; });
  if(ui.editing===id) closeEditor();
  renderEffects();
}

// ---------- éditeur d'effet ----------
let edState = null; // copie de travail
let edCells = null;
function openEditor(id){
  if(id==null){ edState={id:null,name:'',type:'contour',colors:['#5dcaa5'],speed:5,brightness:80}; }
  else { const e=effById(id); edState=JSON.parse(JSON.stringify(e)); }
  ui.editing = id==null ? 'new' : id;
  document.getElementById('edTitle').textContent = id==null?'Nouvel effet':'Modifier l\'effet';
  document.getElementById('edName').value=edState.name;
  document.getElementById('edType').value=edState.type;
  document.getElementById('edSpeed').value=edState.speed;
  document.getElementById('edSpeedV').textContent=edState.speed;
  document.getElementById('edBright').value=edState.brightness;
  document.getElementById('edBrightV').textContent=edState.brightness;
  renderEdColors();
  edCells = buildGrid(document.getElementById('edGrid'), 10, false);
  edPreviewPal = {cups:new Set([{r:7,c:8}])};
  document.getElementById('fxEditor').hidden=false;
  document.getElementById('fxEditor').scrollIntoView({behavior:'smooth'});
  syncColorsRowVisibility();
}
function closeEditor(){ ui.editing=null; edState=null; document.getElementById('fxEditor').hidden=true; }
let edPreviewPal={cups:new Set([{r:7,c:8}])};

function renderEdColors(){
  const box=document.getElementById('edColors'); box.innerHTML='';
  edState.colors.forEach((c,idx)=>{
    const w=document.createElement('div'); w.className='ed-color-wrap';
    w.innerHTML=`<input type="color" value="${c}"><button class="rm" title="retirer">✕</button>`;
    w.querySelector('input').addEventListener('input',e=>{ edState.colors[idx]=e.target.value; });
    w.querySelector('.rm').addEventListener('click',()=>{ if(edState.colors.length>1){edState.colors.splice(idx,1);renderEdColors();} });
    box.appendChild(w);
  });
  document.getElementById('edAddColor').style.display = edState.colors.length>=3?'none':'inline-block';
}
function syncColorsRowVisibility(){
  document.getElementById('edColorsRow').style.opacity = edState.type==='rainbow'?0.4:1;
}
document.getElementById('newFx').addEventListener('click',()=>openEditor(null));
document.getElementById('edClose').addEventListener('click',closeEditor);
document.getElementById('edCancel').addEventListener('click',closeEditor);
document.getElementById('edAddColor').addEventListener('click',()=>{ if(edState.colors.length<3){edState.colors.push(rnd(PALETTE));renderEdColors();} });
document.getElementById('edType').addEventListener('change',e=>{ edState.type=e.target.value; syncColorsRowVisibility(); });
document.getElementById('edName').addEventListener('input',e=>{ edState.name=e.target.value; });
document.getElementById('edSpeed').addEventListener('input',e=>{ edState.speed=+e.target.value; document.getElementById('edSpeedV').textContent=e.target.value; });
document.getElementById('edBright').addEventListener('input',e=>{ edState.brightness=+e.target.value; document.getElementById('edBrightV').textContent=e.target.value; });
document.getElementById('edSave').addEventListener('click',()=>{
  if(!edState.name.trim()) edState.name = FX_NAMES[0]+' '+Math.floor(Math.random()*100);
  if(ui.editing==='new'){ edState.id=nextFxId++; effects.push(edState); }
  else { const i=effects.findIndex(e=>e.id===ui.editing); if(i>=0) effects[i]=edState; }
  closeEditor(); renderEffects();
});

// ---------- génération aléatoire ----------
function randomEffect(){
  const types=['contour','pulse','rainbow','fill','chase'];
  const type=rnd(types);
  const n = type==='rainbow' ? 1 : 1+Math.floor(Math.random()*3);
  const pool=[...PALETTE].sort(()=>Math.random()-0.5);
  const colors=pool.slice(0,n);
  return {
    id:nextFxId++,
    name: rnd(FX_NAMES)+' '+Math.floor(Math.random()*100),
    type, colors,
    speed: 1+Math.floor(Math.random()*10),
    brightness: 50+Math.floor(Math.random()*50)
  };
}
document.getElementById('randomFx').addEventListener('click',()=>{
  const e=randomEffect(); effects.push(e); renderEffects();
  openEditor(e.id); // ouvre direct pour ajuster si besoin
});

// ---------- effets globaux (inter-palettes) ----------
const GLOBAL_TYPES=[
  {id:'wave',name:'Vague traversante'},
  {id:'sync',name:'Pulsation synchronisée'},
  {id:'rainbow',name:'Arc-en-ciel global'},
  {id:'chase',name:'Comète inter-palettes'}
];
let globalFx={active:false,type:'wave',colors:['#5dcaa5','#378add'],speed:5,brightness:85};
let gStripCells=[]; // une grille de cellules par palette, dans l'ordre du bus

function mixHex(a,b,m){
  const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16);
  const ar=(pa>>16)&255,ag=(pa>>8)&255,ab=pa&255,br=(pb>>16)&255,bg=(pb>>8)&255,bb=pb&255;
  return `rgb(${Math.round(ar+(br-ar)*m)},${Math.round(ag+(bg-ag)*m)},${Math.round(ab+(bb-ab)*m)})`;
}
function totalCols(){ return Math.max(1,pallets.length)*N; }
// gx = colonne globale (continue à travers toutes les palettes), gy = ligne
function globalCellStyle(gx,gy,t,gf){
  const sp=gf.speed||5; let col=gf.colors[0]||'#5dcaa5', op=(gf.brightness||85)/100;
  if(gf.type==='wave'){ const w=0.5+0.5*Math.sin(gx*0.35 - t*sp/9); op*=0.2+0.8*w; if(gf.colors.length>1) col=mixHex(gf.colors[0],gf.colors[1],w); }
  else if(gf.type==='sync'){ const w=0.5+0.5*Math.sin(t*sp/18); op*=0.25+0.75*w; if(gf.colors.length>1) col=mixHex(gf.colors[0],gf.colors[1],w); }
  else if(gf.type==='rainbow'){ const h=(gx*7+gy*3+t*sp)%360; col=`hsl(${h},70%,60%)`; }
  else if(gf.type==='chase'){ const span=totalCols()+18; const pos=(t*sp/6)%span; const d=Math.abs(gx-pos); op*= d<6?(1-d/6):0.05; }
  return {col,op:Math.max(0.05,Math.min(1,op))};
}
function paintGlobal(){
  gStripCells.forEach((cells,k)=>{
    cells.forEach((el,i)=>{
      const r=Math.floor(i/N),c=i%N;
      const s=globalCellStyle(k*N+c,r,ui.t,globalFx);
      el.style.background=s.col; el.style.opacity=(0.12+0.88*s.op);
      el.style.boxShadow = s.op>0.45?`0 0 4px ${s.col}`:'';
    });
  });
}
function renderGColors(){
  const box=document.getElementById('gColors'); box.innerHTML='';
  globalFx.colors.forEach((c,idx)=>{
    const w=document.createElement('div'); w.className='ed-color-wrap';
    w.innerHTML=`<input type="color" value="${c}">`;
    w.querySelector('input').addEventListener('input',e=>{ globalFx.colors[idx]=e.target.value; });
    box.appendChild(w);
  });
}
function renderGlobal(){
  const sel=document.getElementById('gType'); sel.innerHTML='';
  GLOBAL_TYPES.forEach(g=>{ const o=document.createElement('option'); o.value=g.id; o.textContent=g.name; sel.appendChild(o); });
  sel.value=globalFx.type;
  renderGColors();
  document.getElementById('gColorsRow').style.opacity = globalFx.type==='rainbow'?0.4:1;
  document.getElementById('gSpeed').value=globalFx.speed; document.getElementById('gSpeedV').textContent=globalFx.speed;
  document.getElementById('gBright').value=globalFx.brightness; document.getElementById('gBrightV').textContent=globalFx.brightness;
  const strip=document.getElementById('gStrip'); strip.innerHTML=''; gStripCells=[];
  pallets.forEach((p,k)=>{
    if(k>0){ const link=document.createElement('div'); link.className='global-link'; link.textContent='→'; strip.appendChild(link); }
    const box=document.createElement('div'); box.className='global-pal';
    const g=document.createElement('div'); g.className='g-grid';
    const nm=document.createElement('div'); nm.className='g-name'; nm.textContent=p.name;
    box.appendChild(g); box.appendChild(nm); strip.appendChild(box);
    gStripCells.push(buildGrid(g,7,false));
  });
}
document.getElementById('gType').addEventListener('change',e=>{ globalFx.type=e.target.value; document.getElementById('gColorsRow').style.opacity=globalFx.type==='rainbow'?0.4:1; });
document.getElementById('gSpeed').addEventListener('input',e=>{ globalFx.speed=+e.target.value; document.getElementById('gSpeedV').textContent=e.target.value; });
document.getElementById('gBright').addEventListener('input',e=>{ globalFx.brightness=+e.target.value; document.getElementById('gBrightV').textContent=e.target.value; });
document.getElementById('gLaunch').addEventListener('click',()=>{
  globalFx.active=true;
  const name=(GLOBAL_TYPES.find(g=>g.id===globalFx.type)||{}).name||'';
  document.getElementById('gMsg').textContent=`« ${name} » diffusé sur le bus → ${pallets.length} palettes synchronisées`;
});
document.getElementById('gStop').addEventListener('click',()=>{
  globalFx.active=false;
  document.getElementById('gMsg').textContent='Effet global arrêté — retour aux effets par palette';
});

// ---------- boucle d'animation ----------
function tick(){
  ui.t++;
  if(ui.view==='console' && consoleCells){
    const p=palById(ui.activePal); if(p) paint(consoleCells, p, effById(p.effectId), ui.t);
  } else if(ui.view==='overview'){
    const cellsMap = ui.ovSub==='plan' ? planCells : ovCells;
    pallets.forEach(p=>{
      const cells=cellsMap[p.id]; if(!cells) return;
      if(globalFx.active) paintGlobalSpatial(cells, p, ui.t);
      else paint(cells, p, effById(p.effectId), ui.t);
    });
  } else if(ui.view==='global'){
    paintGlobal();
  }
  if(ui.editing!=null && edCells && edState){
    paint(edCells, edPreviewPal, edState, ui.t);
  }
  requestAnimationFrame(tick);
}

// ---------- init ----------
setView('overview');
requestAnimationFrame(tick);
