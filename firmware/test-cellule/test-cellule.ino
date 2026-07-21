/* =========================================================================
   Test d'UNE cellule Velostat — lecture de la résistance sur le moniteur série
   ESP32 alimenté en USB. Aucun autre composant que la résistance fixe.

   CÂBLAGE (pont diviseur) :
     3.3V  ──── cuivre du DESSUS
                    │
                 [Velostat]        <- ta cellule
                    │
     cuivre du DESSOUS ──┬──────── GPIO 34   (lecture ADC)
                         │
                    [R_FIXE 5.6k]
                         │
                        GND

   Le point milieu (entre le Velostat et la résistance) va sur GPIO 34.
   GPIO 34 est une entrée analogique pure (ADC1), idéale ici.

   UTILISATION :
     - Outils > Type de carte : "ESP32 Dev Module"
     - Téléverser, puis ouvrir le Moniteur série à 115200 bauds
     - Poser/retirer un gobelet et regarder les valeurs défiler
   ========================================================================= */

// ---------- À AJUSTER ----------
const int   PIN_CELLULE = 34;      // broche ADC de lecture
const float R_FIXE      = 5600.0;  // résistance fixe en ohms (5.6k)
const float VCC_MV      = 3300.0;  // tension d'alimentation du pont (3,3 V)
const float SEUIL_OHMS  = 5000.0;  // sous cette résistance -> objet détecté
const int   ECHANTILLONS = 16;     // moyenne pour stabiliser la lecture
// -------------------------------

void setup() {
  Serial.begin(115200);
  delay(300);
  analogReadResolution(12);                         // 0..4095
  analogSetPinAttenuation(PIN_CELLULE, ADC_11db);   // pleine échelle ~0..3,3 V
  Serial.println();
  Serial.println("=== Test cellule Velostat ===");
  Serial.print("Resistance fixe : "); Serial.print(R_FIXE); Serial.println(" ohms");
  Serial.print("Seuil detection : "); Serial.print(SEUIL_OHMS); Serial.println(" ohms");
  Serial.println("Pose un gobelet sur la cellule pour voir la resistance chuter.");
  Serial.println();
}

void loop() {
  // moyenne de plusieurs lectures (le Velostat est un peu bruité)
  long somme = 0;
  for (int i = 0; i < ECHANTILLONS; i++) {
    somme += analogReadMilliVolts(PIN_CELLULE);     // lecture calibrée, en mV
    delay(2);
  }
  float mv = somme / (float)ECHANTILLONS;

  // Pont diviseur : V = VCC * R_FIXE / (R_FIXE + R_velostat)
  //   =>  R_velostat = R_FIXE * (VCC - V) / V
  float ohms;
  if (mv < 1.0) {
    ohms = 9999999.0;                                // quasi 0 V -> circuit ouvert
  } else {
    ohms = R_FIXE * (VCC_MV - mv) / mv;
    if (ohms < 0) ohms = 0;
  }

  bool detecte = (ohms < SEUIL_OHMS);

  Serial.print("Tension: ");
  Serial.print(mv, 0);
  Serial.print(" mV   |   Resistance: ");
  if (ohms > 999999.0) Serial.print(">1M");
  else if (ohms > 1000.0) { Serial.print(ohms / 1000.0, 1); Serial.print(" kohm"); }
  else { Serial.print(ohms, 0); Serial.print(" ohm"); }
  Serial.print("   |   ");
  Serial.println(detecte ? ">>> OBJET DETECTE <<<" : "vide");

  delay(200);   // ~5 affichages par seconde
}
