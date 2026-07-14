// ===== Serveur de test WebSocket (faux ESP32 / contrôleur) =====
// Simule le côté matériel pour tester l'app sans hardware :
//   - ajoute des palettes au fil du temps (add_palette)
//   - demande d'appliquer des effets (set_effect)
//   - envoie des détections simulées (state : un rond qui bouge)
//   - affiche dans la console ce que l'app envoie (effect / rest)
//
// Lancer :
//   cd tools && npm install && node mock-server.js
// Puis ouvrir l'app avec l'override :
//   http://localhost:8000/?ws=localhost:8080        (app servie en local)
//   http://palint.local/?ws=palint.local:8080       (app servie par la Pi)

const { WebSocketServer } = require('ws');

const N = 16;
const PORT = 8080;
const PALETTE = ['#5dcaa5','#378add','#ef9f27','#d4537e','#7f77dd','#e24b4a','#1d9e75'];
const FX_TYPES = ['contour','pulse','rainbow','fill'];

const wss = new WebSocketServer({ port: PORT, path: '/ws' });
console.log(`Serveur de test WebSocket sur ws://localhost:${PORT}/ws`);
console.log('Ouvre l\'app avec  ?ws=<hote>:' + PORT + '  (ex http://localhost:8000/?ws=localhost:8080)\n');

// état simulé des palettes
let pallets = [];       // { id, name, cx, cy, vx, vy }
let nextId = 1;

function rnd(a){ return a[Math.floor(Math.random()*a.length)]; }
function broadcast(obj){
  const s = JSON.stringify(obj);
  wss.clients.forEach(c=>{ if(c.readyState===1) c.send(s); });
}

function addPalette(){
  if(pallets.length >= 6) return;
  const id = nextId++;
  pallets.push({ id, name:'Palette '+id, cx:8+Math.random()*4, cy:8, vx:(Math.random()-0.5)*0.6, vy:(Math.random()-0.5)*0.6 });
  console.log(`+ palette ${id} rejoint le réseau`);
  broadcast({ type:'add_palette', id, name:'Palette '+id });
  // on lui applique aussi un effet au hasard
  applyRandomEffect(id);
}

function applyRandomEffect(id){
  const effect = { type:rnd(FX_TYPES), color:rnd(PALETTE), speed:1+Math.floor(Math.random()*10), bright:60+Math.floor(Math.random()*40) };
  console.log(`  -> applique effet "${effect.type}" ${effect.color} sur palette ${id}`);
  broadcast({ type:'set_effect', id, effect });
}

// détection simulée : un rond qui se balade sur chaque palette
function tickState(){
  pallets.forEach(p=>{
    p.cx += p.vx; p.cy += p.vy;
    if(p.cx<3||p.cx>12) p.vx*=-1;
    if(p.cy<3||p.cy>12) p.vy*=-1;
    const cells = [];
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      if((r-p.cy)*(r-p.cy)+(c-p.cx)*(c-p.cx) <= 6) cells.push(r*N+c);
    }
    broadcast({ type:'state', id:p.id, cells });
  });
}

wss.on('connection', ws=>{
  console.log('App connectée');
  // (re)synchronise les palettes déjà présentes
  pallets.forEach(p=> ws.send(JSON.stringify({ type:'add_palette', id:p.id, name:p.name })));
  ws.on('message', data=>{
    try{
      const msg = JSON.parse(data);
      if(msg.type==='effect') console.log(`<- app: effet "${msg.effect.type}" ${msg.effect.color} (palette ${msg.id})`);
      else if(msg.type==='rest') console.log(`<- app: repos "${msg.rest.type}" ${msg.rest.color}`);
    }catch(e){}
  });
  ws.on('close', ()=> console.log('App déconnectée'));
});

// scénario : une palette au départ, puis une nouvelle toutes les 7 s ;
// un effet appliqué au hasard toutes les 5 s ; détections 8 fois/s.
addPalette();
setInterval(addPalette, 7000);
setInterval(()=>{ if(pallets.length) applyRandomEffect(rnd(pallets).id); }, 5000);
setInterval(tickState, 120);
