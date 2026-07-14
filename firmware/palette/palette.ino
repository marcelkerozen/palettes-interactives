/* =========================================================================
   Palettes interactives — firmware d'une palette (prototype 1 palette)
   ESP32 : WiFi + WebSocket + sert l'app (LittleFS) + pilote la matrice LED.

   Rôle :
   - se connecte au WiFi
   - sert l'app web (index.html/css/js placés dans le dossier data/ -> LittleFS)
   - ouvre un WebSocket /ws
       * reçoit de l'app  : {"type":"effect", ...} et {"type":"rest", ...}
       * envoie à l'app   : {"type":"state","cells":[i,...]}  (cellules pressées)
   - lit la grille Velostat (ou une démo tant que les capteurs ne sont pas câblés)
   - calcule le contour et rend l'effet sur la matrice 16x16 (FastLED)

   Librairies (Gestionnaire de bibliothèques) :
     FastLED, ArduinoJson, ESPAsyncWebServer, AsyncTCP
   Voir docs/connexion-esp32.md pour l'installation et le flash.
   ========================================================================= */

#include <WiFi.h>
#include <LittleFS.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <FastLED.h>

// ---------- À ADAPTER ----------
const char* WIFI_SSID = "TON_RESEAU_WIFI";
const char* WIFI_PASS = "TON_MOT_DE_PASSE";
#define LED_PIN    13      // broche data vers la matrice (via level shifter)
#define USE_SENSORS 0      // 0 = démo (blob qui bouge), 1 = vraie lecture Velostat
// -------------------------------

#define N          16
#define NUM_LEDS   (N*N)
#define MAXBRIGHT  150     // plafond de luminosité (sécurité alim)

CRGB leds[NUM_LEDS];
bool pressed[NUM_LEDS];    // grille détectée : true = cellule occupée

AsyncWebServer server(80);
AsyncWebSocket  ws("/ws");

// effet courant (piloté par l'app)
struct { String type="contour"; long color=0x5DCAA5; int speed=5; int bright=80; } fx;
struct { String type="breath";  long color=0x1D9E75; int speed=3; int bright=32; } rest;

// ---------- matrice : câblage serpentin ----------
uint16_t XY(int x, int y){
  if (y & 1) return y*N + (N-1-x);   // une ligne sur deux est inversée
  return y*N + x;
}

// ---------- lecture de la grille ----------
#if USE_SENSORS
// Câblage type : 2x 74HC4067. rowMux distribue 3.3V à une ligne, colMux lit une colonne.
const int ROW_S[4] = {32,33,25,26};  // sélection ligne (S0..S3 du mux lignes)
const int COL_S[4] = {27,14,12,4};   // sélection colonne (S0..S3 du mux colonnes)
const int SIG_PIN  = 34;             // entrée ADC (SIG du mux colonnes)
const int ROW_COM  = 2;              // COM du mux lignes (mis à HIGH pour driver la ligne)
const int THRESHOLD = 800;           // seuil ADC (à calibrer !)

void selectMux(const int s[4], int ch){
  for (int b=0;b<4;b++) digitalWrite(s[b], (ch>>b)&1);
}
void readGrid(){
  for (int r=0;r<N;r++){
    selectMux(ROW_S, r);
    digitalWrite(ROW_COM, HIGH);       // alimente la ligne r
    for (int c=0;c<N;c++){
      selectMux(COL_S, c);
      delayMicroseconds(30);
      int v = analogRead(SIG_PIN);     // tension au croisement (r,c)
      pressed[r*N+c] = (v > THRESHOLD); // pressé -> résistance basse -> tension change
    }
    digitalWrite(ROW_COM, LOW);
  }
}
#else
// DÉMO : un rond qui se balade, pour tester l'app + les LED avant de câbler les capteurs
void readGrid(){
  float t = millis()/600.0;
  int cx = 8 + 5*sin(t), cy = 8 + 4*cos(t*0.8);
  for (int i=0;i<NUM_LEDS;i++){
    int r=i/N, c=i%N;
    pressed[i] = ( (r-cy)*(r-cy) + (c-cx)*(c-cx) ) <= 6;  // disque
  }
}
#endif

// ---------- contour ----------
bool isEdge(int r,int c){
  if(!pressed[r*N+c]) return false;
  if(r==0||c==0||r==N-1||c==N-1) return true;
  return !pressed[(r-1)*N+c] || !pressed[(r+1)*N+c] || !pressed[r*N+(c-1)] || !pressed[r*N+(c+1)];
}
bool anyPressed(){ for(int i=0;i<NUM_LEDS;i++) if(pressed[i]) return true; return false; }

// ---------- rendu de l'effet sur la matrice ----------
void render(){
  float t = millis()/16.0;
  CRGB base = CRGB((fx.color>>16)&0xFF,(fx.color>>8)&0xFF,fx.color&0xFF);
  CRGB rc   = CRGB((rest.color>>16)&0xFF,(rest.color>>8)&0xFF,rest.color&0xFF);
  bool empty = !anyPressed();

  for (int r=0;r<N;r++) for (int c=0;c<N;c++){
    int i=r*N+c; CRGB col=CRGB::Black;

    if (empty){                                   // effet de repos
      float o=(rest.bright/100.0);
      if(rest.type=="off") o=0;
      else if(rest.type=="breath") o*=0.3+0.7*(0.5+0.5*sin(t*rest.speed/40));
      else if(rest.type=="wave")   o*=0.15+0.85*(0.5+0.5*sin((c+r)*0.4 - t*rest.speed/25));
      col = rc; col.nscale8((uint8_t)(o*255));
    } else {                                      // effet actif
      float o=(fx.bright/100.0); bool lit=false; col=base;
      bool edge=isEdge(r,c), fill=pressed[i];
      if(fx.type=="fill"){ lit=fill; }
      else if(fx.type=="pulse"){ lit=edge; o*=0.45+0.55*fabs(sin(t*fx.speed/60)); }
      else if(fx.type=="rainbow"){ if(edge){lit=true; col=CHSV((uint8_t)((int)(t*fx.speed + c*14 + r*14)%256),200,255);} }
      else { lit=edge; } // contour par défaut
      if(!lit){ col=CRGB::Black; } else { col.nscale8((uint8_t)(o*255)); }
    }
    leds[XY(c,r)] = col;
  }
  FastLED.show();
}

// ---------- WebSocket ----------
void sendState(){
  JsonDocument doc; doc["type"]="state";
  JsonArray a = doc["cells"].to<JsonArray>();
  for(int i=0;i<NUM_LEDS;i++) if(pressed[i]) a.add(i);
  String out; serializeJson(doc,out); ws.textAll(out);
}
void onWsEvent(AsyncWebSocket*, AsyncWebSocketClient* client, AwsEventType type, void*, uint8_t* data, size_t len){
  if(type==WS_EVT_CONNECT){ Serial.println("App connectee"); sendState(); }
  else if(type==WS_EVT_DATA){
    JsonDocument doc; if(deserializeJson(doc,data,len)) return;
    String t = doc["type"] | "";
    if(t=="effect"){
      fx.type   = String((const char*)(doc["effect"]["type"]  | "contour"));
      fx.color  = strtol(String((const char*)(doc["effect"]["color"]|"#5dcaa5")).substring(1).c_str(),NULL,16);
      fx.speed  = doc["effect"]["speed"]  | 5;
      fx.bright = doc["effect"]["bright"] | 80;
    } else if(t=="rest"){
      rest.type   = String((const char*)(doc["rest"]["type"] | "breath"));
      rest.color  = strtol(String((const char*)(doc["rest"]["color"]|"#1d9e75")).substring(1).c_str(),NULL,16);
      rest.speed  = doc["rest"]["speed"]  | 3;
      rest.bright = doc["rest"]["bright"] | 32;
    }
  }
}

void setup(){
  Serial.begin(115200);
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(MAXBRIGHT);

#if USE_SENSORS
  for(int b=0;b<4;b++){ pinMode(ROW_S[b],OUTPUT); pinMode(COL_S[b],OUTPUT); }
  pinMode(ROW_COM,OUTPUT); analogReadResolution(12);
#endif

  if(!LittleFS.begin(true)) Serial.println("LittleFS KO");

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connexion WiFi");
  while(WiFi.status()!=WL_CONNECTED){ delay(400); Serial.print("."); }
  Serial.println();
  Serial.print(">>> Ouvre http://"); Serial.print(WiFi.localIP()); Serial.println("/ dans ton navigateur");

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  server.begin();
}

unsigned long lastSend=0;
void loop(){
  readGrid();
  render();
  ws.cleanupClients();
  if(millis()-lastSend > 80){ lastSend=millis(); sendState(); }  // ~12 fps vers l'app
}
