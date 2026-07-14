// ===== net.js — connexion WebSocket (ESP32 réel ou serveur de test) =====
// L'app reste en MODE DÉMO tant qu'aucun serveur n'est joignable.
//
// Adresse du WebSocket :
//   - par défaut : même hôte que la page, sur /ws  (cas ESP32 qui sert l'app)
//   - override pour tester : ajoute ?ws=HOTE:PORT à l'URL de l'app
//     ex : http://localhost:8000/?ws=localhost:8080
//
// Messages reçus (serveur -> app) :
//   {type:"add_palette", id, name}          une palette rejoint le réseau
//   {type:"remove_palette", id}             une palette quitte
//   {type:"set_effect", id, effect:{type,color,speed,bright}}   applique un effet
//   {type:"state", id, cells:[i,...]}        cellules détectées d'une palette
// Messages envoyés (app -> serveur) :
//   {type:"effect", id, effect:{...}}        l'utilisateur a changé un effet
//   {type:"rest", rest:{...}}                effet de repos
// Charge ce fichier APRÈS app.js.

(function(){
  const override = new URLSearchParams(location.search).get('ws');   // ex "localhost:8080"
  const target = override || (location.hostname || '192.168.1.50');
  const WS_URL = `ws://${target}/ws`;

  let ws = null, connected = false;

  function badge(txt){ const b=document.getElementById('busTxt'); if(b) b.textContent = txt; }
  function demoBadge(){ badge(`Bus RS485 · ${pallets.length} palette${pallets.length>1?'s':''} (démo)`); }

  function connect(){
    if(location.protocol === 'https:'){ demoBadge(); return; } // ws:// bloqué en https
    try{
      ws = new WebSocket(WS_URL);
      ws.onopen = ()=>{ connected=true; badge('Serveur connecté ✓'); pushEffect(); };
      ws.onclose = ()=>{ connected=false; demoBadge(); pallets.forEach(p=>p.liveCells=null); setTimeout(connect, 2000); };
      ws.onerror = ()=>{ try{ ws.close(); }catch(e){} };
      ws.onmessage = e=>{ try{ handle(JSON.parse(e.data)); }catch(err){} };
    }catch(err){ setTimeout(connect, 2000); }
  }

  const TYPE_LABEL = {contour:'Contour', fill:'Remplissage', pulse:'Pulsation', rainbow:'Arc-en-ciel', chase:'Poursuite'};
  function normEffect(e){
    return { id:-1, name:e.name||TYPE_LABEL[e.type]||e.type||'réseau', type:e.type||'contour',
             colors:[e.color||'#5dcaa5'], speed:e.speed||5, brightness:e.bright||80 };
  }

  function handle(msg){
    switch(msg.type){
      case 'add_palette': {
        if(!palById(msg.id)){
          const k = pallets.length;
          pallets.push({ id:msg.id, name:msg.name||('Palette '+msg.id),
                         cups:new Set(), effectId:effects[0].id, pos:{x:40+k*150, y:60} });
          window.appRefresh && window.appRefresh();
        }
        break;
      }
      case 'remove_palette': {
        pallets = pallets.filter(p=>p.id!==msg.id);
        window.appRefresh && window.appRefresh();
        break;
      }
      case 'set_effect': {
        const p = palById(msg.id);
        if(p && msg.effect){ p.liveEffect = normEffect(msg.effect); }
        break;
      }
      case 'state': {
        const p = palById(msg.id);
        if(p){ p.liveCells = new Set(msg.cells || []); }
        break;
      }
    }
  }

  // envoi de l'effet courant (palette active) vers le serveur — pour tester le sens app -> serveur
  function pushEffect(){
    if(!connected || !ws || ws.readyState!==1) return;
    const p = palById(ui.activePal) || pallets[0]; if(!p) return;
    const e = curEffect(p);
    ws.send(JSON.stringify({type:'effect', id:p.id, effect:{type:e.type, color:e.colors[0], speed:e.speed, bright:e.brightness}}));
    ws.send(JSON.stringify({type:'rest', rest:{type:restFx.type, color:restFx.color, speed:restFx.speed, bright:restFx.brightness}}));
  }

  window.paletteNet = { pushEffect, isConnected:()=>connected };
  connect();
})();
