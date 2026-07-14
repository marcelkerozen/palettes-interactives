#!/usr/bin/env bash
# Met à jour l'app sur la Raspberry Pi :
#   récupère la dernière version depuis GitHub puis la publie sur nginx.
# Usage sur la Pi : ./maj.sh
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "→ Récupération de la dernière version..."
git pull

echo "→ Publication vers nginx..."
sudo cp "$DIR"/index.html "$DIR"/styles.css "$DIR"/app.js "$DIR"/net.js /var/www/html/

echo "✓ App à jour — http://palint.local"
