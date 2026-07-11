# Architecture complète — Palettes interactives (RS485 filaire)

Liaison entre palettes : filaire, bus RS485 en câble enterré, alimentation 24 V.

## 1. Vue d'ensemble

N palettes autonomes, chacune avec un ESP32, reliées en chaîne par un câble enterré (données RS485 + alimentation dans la même gaine). Un contrôleur central (Raspberry Pi ou laptop) en tête de chaîne fait tourner le backend de l'app et pilote le bus. Chaque palette détecte les eco cups via une matrice Velostat et allume un contour LED.

Chaîne logique : App ⇄ WebSocket ⇄ Backend (contrôleur) ⇄ USB-RS485 ⇄ Bus RS485 ⇄ ESP32 ⇄ matrice + LED.

## 2. Topologie et câblage

Bus RS485 en daisy-chain (contrôleur → palette 1 → palette 2 → …). Paire torsadée blindée A/B + masse de référence. Terminaison 120 Ω aux deux extrémités. Alimentation par conducteurs séparés : 24 V distribué, abaissé en 5 V localement (buck) par palette. Connecteurs étanches IP67 à chaque palette pour la modularité.

## 3. Détection — matrice Velostat

Grille cuivre lignes × colonnes, Velostat intercalé ; chaque intersection = cellule dont la résistance chute sous le poids. Lecture par balayage matriciel : l'ESP32 active une ligne à la fois, lit chaque colonne via un multiplexeur 74HC4067 → ADC. Résolution ~16×16, cellule ~2-3 cm pour qu'un bord de cup couvre plusieurs cellules. **Défi n°1** : cup vide (~30 g), Velostat sensible + seuil calibré + moyennage ; à prototyper en premier.

## 4. Affichage — LED

LED adressables (WS2815 en 24 V ou WS2812 via buck 5 V) sous la grille, pilotées par une broche de l'ESP32 via level shifter (3,3→5 V). Contour calculé depuis le bitmap des cellules actives ; effets configurables.

## 5. Alimentation

WS2812 ~60 mA max/LED. 256 LED → pic théorique ~15 A à 5 V. Usage réel (contour) ~1-3 A. Distribuer 24 V sur le bus réduit le courant et la chute de tension dans le câble enterré ; abaisser en 5 V localement. Fusible par palette, masse commune.

## 6. Communication — RS485

Transceiver MAX485 par ESP32 sur UART, half-duplex. Contrôleur = maître, palettes = esclaves adressés. Auto-enregistrement au démarrage. Trame maison (start, adresse, commande, longueur, payload, CRC) ou Modbus RTU. ~115200 bauds.

Messages : maître→palette (set_effect, power, get_status) ; palette→maître (hello/register, cells/events, heartbeat).

## 7. Contrôleur central + app

Raspberry Pi (ou laptop) en tête de bus via adaptateur USB-RS485. Deux services : gestionnaire de bus (RS485, registre/état) + backend (WebSocket/REST ou MQTT). App web servie localement : découvrir/ajouter/retirer/nommer les palettes, bibliothèque d'effets, vue live des cellules, scènes multi-palettes.

## 8. Nomenclature (par palette)

ESP32, transceiver MAX485, mux 74HC4067, level shifter 74AHCT125, buck 24→5 V, scotch cuivre + Velostat, ~256 LED, plexiglas, palette bois, 2 connecteurs IP67. Global : Raspberry Pi, adaptateur USB-RS485, alim 24 V, câble enterré, 2× résistances 120 Ω.

## 9. Prototypage (étapes)

1. Une cellule Velostat + ESP32 → valider la détection d'un cup vide.
2. Petite grille 4×4 + mux + quelques LED → valider le contour.
3. RS485 entre 2 ESP32 + contrôleur → valider protocole et adressage.
4. Une palette complète, puis multi-palettes → valider l'alimentation 24 V.
5. Intégration de l'app.

## 10. Points de vigilance

Sensibilité aux cups vides ; budget courant LED et chute de tension ; masse/terminaison RS485 ; étanchéité extérieure (plexi scellé, IP67, condensation) ; connecteurs détrompés pour la modularité.
