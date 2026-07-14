# Héberger l'app sur la Raspberry Pi (mode simulation)

Objectif : faire tourner l'app sur la Pi, accessible depuis n'importe quel appareil du réseau local (téléphone, laptop). Pour l'instant **aucun matériel** n'est nécessaire : l'app fonctionne en **mode démo** (on pose les cups à la souris). C'est de l'hébergement de fichiers statiques, rien d'autre.

## 1. Récupérer le code sur la Pi

Sur la Pi (terminal, ou SSH depuis ton laptop) :

```bash
sudo apt update && sudo apt install -y git      # si git n'est pas déjà là
git clone https://github.com/marcelkerozen/palettes-interactives.git
cd palettes-interactives
```

Pour mettre à jour plus tard (après un push de nouvelles versions) :

```bash
cd palettes-interactives && git pull
```

## 2. Test rapide (Python, rien à installer)

```bash
cd ~/palettes-interactives
python3 -m http.server 8000
```

Trouve l'IP de ta Pi :

```bash
hostname -I        # ex : 192.168.1.42
```

Depuis n'importe quel appareil du réseau, ouvre :

```
http://192.168.1.42:8000
```

L'app s'affiche, en mode démo. (Ctrl+C pour arrêter le serveur.)

## 3. Serveur permanent qui démarre tout seul (nginx)

Pour que l'app soit toujours dispo, même après un redémarrage, sans lancer de commande :

```bash
sudo apt install -y nginx
sudo rm -f /var/www/html/index.nginx-debian.html
sudo cp -r ~/palettes-interactives/* /var/www/html/
```

L'app est alors servie sur le port 80 :

```
http://192.168.1.42
```

nginx démarre automatiquement au boot. Après un `git pull`, recopie les fichiers :

```bash
cd ~/palettes-interactives && git pull && sudo cp -r ~/palettes-interactives/* /var/www/html/
```

(Astuce : tu peux mettre ces deux lignes dans un petit script `maj.sh` pour tout mettre à jour d'un coup.)

## À propos du mode démo / connexion

- Le fichier `net.js` essaie de se connecter à un ESP32 en WebSocket. Tant qu'il n'y a pas d'ESP32, il **retombe automatiquement en mode démo** — c'est normal et sans conséquence, l'app marche.
- Quand tu auras une vraie palette, tu renseigneras l'IP de l'ESP32 dans `net.js`, et l'app affichera les vraies détections. Le firmware est déjà prêt dans `firmware/palette/`.

## Accès plus confortable (optionnel)

- Nom au lieu de l'IP : si ta Pi s'appelle `raspberrypi`, tu peux souvent l'atteindre via `http://raspberrypi.local` (mDNS).
- IP fixe : réserve l'adresse de la Pi dans ta box pour qu'elle ne change pas.
