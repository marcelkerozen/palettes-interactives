# Matériel — prototype d'une palette

Liste pour construire **une seule palette** de test. Prix estimatifs (à vérifier au moment de l'achat), orientés fournisseurs FR/EU (Amazon.fr, AliExpress, Gotronic, Kubii, Opencircuit, Reichelt/TME).

Choix pour ce prototype : matrice LED **16×16 WS2812B en 5 V** (256 LED, une par cellule) + grille de détection 16×16. C'est le plus simple pour démarrer. L'installation finale multi-palettes repassera sur du **WS2815 12 V** avec distribution 24 V (voir `architecture.md`).

## Détection (matrice de pression)

| Élément | Qté | Prix estimé | Notes |
|---|---|---|---|
| Feuille Velostat / Linqstat (28×28 cm) | 1–2 | ~7 € pièce | Le cœur de la détection. Adafruit #1361, Opencircuit, Kubii, AliExpress |
| Scotch cuivre adhésif **conducteur** (rouleau 5–10 mm) | 2 | ~8 € pièce | Impératif : adhésif conducteur (sinon les couches ne conduisent pas). Lignes + colonnes |
| Modules CD74HC4067 (mux/démux 16 voies) | 2 | ~3 € pièce | 1 pour sélectionner la ligne, 1 pour lire la colonne via l'ADC |
| Assortiment de résistances (dont 10 kΩ) | 1 kit | ~8 € | Ponts diviseurs de lecture |
| Nappe / fils de câblage | 1 | ~6 € | Relier lignes et colonnes |

## Cerveau + lecture

| Élément | Qté | Prix estimé | Notes |
|---|---|---|---|
| ESP32 DevKit (ESP32-WROOM-32) | 1 | ~8 € | Scanne la matrice, pilote les LED |
| Level shifter 74AHCT125 (ou module) | 1 | ~3 € | Adapte la data 3,3 V → 5 V pour les WS2812 |
| Breadboard + jumpers (kit) | 1 | ~10 € | Prototypage sans soudure |

## Affichage (LED)

| Élément | Qté | Prix estimé | Notes |
|---|---|---|---|
| Matrice LED 16×16 WS2812B (256 px, 5 V, souple) | 1 | ~20–30 € | BTF-LIGHTING / WESIRI / ALITOVE. Une LED par cellule |
| Alimentation 5 V 10 A (à bornier) | 1 | ~18 € | Pic théorique 256 LED blanc ≈ 15 A ; on plafonne la luminosité dans l'app, 10 A suffit pour un proto |
| Condensateur 1000 µF / 16 V + résistance 470 Ω | 1 | ~3 € | Bonnes pratiques WS2812 (lissage alim + protection data) |
| Connecteurs DC / JST | 1 lot | ~5 € | Raccordements alim et data |

## Structure physique

| Élément | Qté | Prix estimé | Notes |
|---|---|---|---|
| Palette bois | 1 | souvent gratuite | Récupération (magasins, chantiers) |
| Plaque plexiglas / acrylique 3 mm (~30×30 cm) | 1 | ~12 € | Protège et plaque la grille. Découpe possible en magasin |
| Feuille mousse EVA fine | 1 | ~5 € | Optionnel : répartit la pression, aide à détecter les cups légers |

## Outils (si tu ne les as pas déjà)

Fer à souder + étain, multimètre, pince à dénuder.

## Total estimatif

~**110–140 €** pour une palette prototype (hors outils).

## Conseils de démarrage

1. **Avant d'acheter en quantité**, teste **une seule cellule Velostat + ESP32** pour valider la détection d'un eco cup **vide** (~30 g) — c'est le risque n°1 du projet.
2. Tu peux commencer par une grille de détection plus grossière (**8×8**) pour valider le principe : bien plus facile à câbler, et tu mappes ensuite sur la matrice LED.
3. Aligne la zone de détection sur la matrice LED (~16 cm) pour que cellules et LED correspondent.
