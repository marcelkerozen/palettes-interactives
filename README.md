# Palettes interactives

Palettes en bois transformées en tables interactives pour festivals. Quand on pose un eco cup (vide ou plein) sur une palette, un contour lumineux s'allume en dessous. Plusieurs palettes se connectent en chaîne via un bus filaire enterré (RS485, 24 V), et l'ensemble est piloté depuis cette application.

## Contenu du dépôt

- `index.html`, `styles.css`, `app.js` — l'application console (prototype interactif).
- `docs/board.md` — vue d'ensemble du projet en 5 couches.
- `docs/architecture.md` — architecture technique complète (câblage, RS485, alimentation, matériel).

## Lancer l'app

Ouvrir `index.html` dans un navigateur, ou éditer le projet sur CodeSandbox (voir ci-dessous).

## Workflow d'édition (Martin + Paul)

Le dépôt GitHub est la source de vérité. L'édition à deux se fait en temps réel sur **CodeSandbox**, importé depuis ce dépôt.

- Édition à deux en direct : sur CodeSandbox (curseurs partagés).
- Modifs poussées via Git : apparaissent dans CodeSandbox après un `pull`.
- Toujours commiter depuis CodeSandbox vers GitHub pour garder le dépôt à jour.

## Choix techniques retenus

- Détection : matrice de pression Velostat (lignes × colonnes), lue par multiplexeur.
- Cerveau : un ESP32 par palette.
- Réseau : bus RS485 filaire enterré, une palette maître = contrôleur central.
- Alimentation : 24 V distribué sur le bus, abaissé en 5 V localement (buck) par palette.
- Affichage : LED adressables (contour de l'objet posé).
