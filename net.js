// ===== net.js — connexion à l'ESP32 (WebSocket) =====
// Si l'app est servie PAR l'ESP32 (http://<ip-esp32>/), la connexion est automatique.
// Sinon (ouverte depuis CodeSandbox/GitHub), l'app reste en MODE DÉMO (cups à la souris).
// Charge ce fichier APRÈS app.js.

(function(){
  // Hôte de l'ESP32 : le même que la page si servie par l'ESP32,
  // sinon mets ici l'IP fixe de ton ESP32 pour tester en local (http).
  const ESP_IP = (location.hostname && location.hostname !== '') ? location.hostname : '192.168.1.50';

  let ws = null, connected = false;

  function setBadge(on){
    const b = document.getElementById('busTxt');
    if(!b) return;
    b.textContent = on ? 'ESP32 connecté ✓' : `Bus RS485 · ${pallets.length} palette${pallets.length>1?'s':''} en ligne (démo)`;
  }

  function connect(){
    // ws:// bloqué si la page est en https (mixed content) -> on reste en démo
    if(location.protocol === 'https:') { setBadge(false); return; }
    try{
      ws = new WebSocket(`ws://${ESP_IP}/ws`);
      ws.onopen = ()=>{ connected=true; setBadge(true); pushEffect(); };
      ws.onclose = ()=>{ connected=false; setBadge(false); if(pallets[0]) pallets[0].liveCells=null; setTimeout(connect, 2000); };
      ws.onerror = ()=>{ try{ ws.close(); }catch(e){} };
      ws.onmessage = e=>{ try{ handle(JSON.parse(e.data)); }catch(err){} };
    }catch(err){ setTimeout(connect, 2000); }
  }

  function handle(msg){
    if(msg.type === 'state' && pallets[0]){
      // les cellules réellement détectées par l'ESP32 deviennent l'empreinte de la palette 1
      pallets[0].liveCells = new Set(msg.cells);
    }
  }

  // envoie à l'ESP32 l'effet courant de la palette 1 + l'effet de repos
  function pushEffect(){
    if(!connected || !ws || ws.readyState!==1) return;
    const p = pallets[0]; if(!p) return;
    const e = effById(p.effectId);
    ws.send(JSON.stringify({type:'effect', effect:{type:e.type, color:e.colors[0], speed:e.speed, bright:e.brightness}}));
    ws.send(JSON.stringify({type:'rest',   rest:{type:restFx.type, color:restFx.color, speed:restFx.speed, bright:restFx.brightness}}));
  }

  // exposé pour app.js (appelé quand l'utilisateur change un effet)
  window.paletteNet = { pushEffect, isConnected:()=>connected };

  connect();
})();
