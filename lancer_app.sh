#!/bin/bash

# Chemin absolu vers le dossier du projet
PROJECT_DIR="/Users/ilyesnajjari/dashboard-agricole-intelligent"

# Aller dans le dossier du projet
cd "$PROJECT_DIR"

# Lancer le backend Django en arrière-plan
echo "Démarrage du serveur Backend..."
source .venv/bin/activate
cd backend
python3 manage.py runserver &
BACKEND_PID=$!
cd ..

# Lancer le frontend Next.js en arrière-plan
echo "Démarrage du serveur Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Attendre quelques secondes que les serveurs démarrent
sleep 5

# Ouvrir l'application dans le navigateur par défaut
open "http://localhost:3000"

# Fonction pour tuer les processus lors de la fermeture du script
cleanup() {
    echo "Arrêt des serveurs..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit
}

# Piéger le signal de sortie (Ctrl+C) pour nettoyer
trap cleanup SIGINT

# Garder le script ouvert pour maintenir les serveurs actifs
echo "L'application est en cours d'exécution. Fermez cette fenêtre pour arrêter les serveurs."
wait
