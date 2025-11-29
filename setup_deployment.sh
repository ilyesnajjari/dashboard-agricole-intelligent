#!/bin/bash

# Script de déploiement et d'initialisation
# À exécuter lors de l'installation sur un nouvel ordinateur

echo "==================================================="
echo "   INITIALISATION DASHBOARD AGRICOLE INTELLIGENT   "
echo "==================================================="

# 1. Création du dossier de sauvegarde sur le Bureau
BACKUP_DIR="$HOME/Desktop/Backups_Dashboard_Agricole"
echo "[1/3] Vérification du dossier de sauvegarde..."
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "  -> Dossier créé : $BACKUP_DIR"
else
    echo "  -> Le dossier existe déjà : $BACKUP_DIR"
fi

# 2. Configuration du Backend
echo ""
echo "[2/3] Configuration du Backend..."

# Création du venv à la racine si nécessaire
if [ ! -d ".venv" ]; then
    echo "  -> Création de l'environnement virtuel Python..."
    python3 -m venv .venv
fi

source .venv/bin/activate

cd backend || exit
echo "  -> Installation des dépendances..."
pip install -r requirements.txt > /dev/null 2>&1
echo "  -> Application des migrations..."
python manage.py migrate > /dev/null 2>&1

# 3. Configuration du Frontend
echo ""
echo "[3/3] Configuration du Frontend..."
cd ../frontend || exit
echo "  -> Installation des dépendances Node (cela peut prendre un moment)..."
npm install > /dev/null 2>&1

echo ""
echo "==================================================="
echo "          INSTALLATION TERMINÉE AVEC SUCCÈS        "
echo "==================================================="
echo ""
echo "Pour lancer l'application, utilisez simplement :"
echo "./lancer_app.sh"
echo ""
echo "Ou manuellement :"
echo "1. Backend : source .venv/bin/activate && cd backend && python manage.py runserver"
echo "2. Frontend : cd frontend && npm run dev"
echo ""
