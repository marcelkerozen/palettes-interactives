# Board du projet — Palettes interactives

Vue d'ensemble en 5 couches, du bois jusqu'à l'application. Liaison entre palettes : filaire RS485.

## Couche 1 — Physique
- **Palette + structure** : palette bois servant de table, robuste et transportable.
- **Grille cuivre + Velostat** : bandes de cuivre en lignes × colonnes, Velostat intercalé = matrice de pression.
- **Plexiglas** : plaque le cuivre contre la palette, à garder fin pour rester sensible.

## Couche 2 — Détection & affichage
- **Détection eco cups** : la matrice détecte le poids, vide ou plein. Point de vigilance n°1 : le cup vide (~30 g), à valider en premier.
- **LED adressables** : bande sous la grille ; les cellules actives déterminent le contour lumineux.
- **Bibliothèque d'effets** : effets LED réutilisables déclenchés par l'app.

## Couche 3 — Cerveau par palette
- **ESP32** : scanne la matrice, pilote les LED, communique sur le bus.
- **Multiplexeurs** (74HC4067) : lire beaucoup de cellules avec peu de broches.
- **Auto-enregistrement** : chaque palette s'annonce au démarrage → ajout/retrait à chaud.

## Couche 4 — Réseau & alimentation
- **Données** : bus RS485 filaire enterré, contrôleur maître + palettes esclaves adressées.
- **Alimentation** : 24 V sur le bus, abaissé en 5 V localement par palette.

## Couche 5 — Logiciel
- **Contrôleur central** : Raspberry Pi (ou laptop) en tête de bus via USB-RS485.
- **Application** : web app pour ajouter/retirer des palettes, gérer et déclencher les effets.

## Points ouverts
1. Détection d'un cup **vide** — à prototyper en priorité sur une cellule.
2. Budget électrique des LED et section du câble enterré — à dimensionner.
