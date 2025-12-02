#!/bin/bash

# Configuration
PROJECT_DIR="/Users/ilyesnajjari/dashboard-agricole-intelligent"
BACKEND_PORT=8000
FRONTEND_PORT=3000
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction Spinner
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Fonction pour attendre qu'un port soit ouvert
wait_for_port() {
    local port=$1
    local service=$2
    printf "${BLUE}Démarrage $service...${NC} "
    
    # Boucle d'attente avec spinner visuel simulé
    local spinstr='|/-\'
    while ! nc -z localhost $port; do
        local temp=${spinstr#?}
        printf "[%c]" "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep 0.1
        printf "\b\b\b"
    done
    printf "${GREEN}OK!${NC}\n"
}

cleanup() {
    echo ""
    echo -e "${BLUE}Arrêt des serveurs...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT

# Aller dans le dossier du projet
cd "$PROJECT_DIR"

# 1. Démarrage Backend
source .venv/bin/activate
cd backend
python3 manage.py runserver > /dev/null 2>&1 &
BACKEND_PID=$!
cd ..

# 2. Démarrage Frontend (Mode Turbo Dev)
cd frontend
echo -e "${BLUE}Lancement du Frontend (Mode Turbo)...${NC}"
# On utilise --turbo pour un démarrage et une compilation ultra-rapides
npm run dev -- --turbo > /dev/null 2>&1 &
echo $! > frontend.pid
cd ..

# 3. Attente active des ports
# On attend que le backend soit prêt (rapide)
wait_for_port $BACKEND_PORT "Backend (API)"

# On attend que le frontend soit prêt
echo -e "${BLUE}Attente du Frontend...${NC}"
wait_for_port $FRONTEND_PORT "Frontend (Dashboard)"

# Récupération du PID Frontend pour le cleanup
if [ -f frontend/frontend.pid ]; then
    FRONTEND_PID=$(cat frontend/frontend.pid)
    rm frontend/frontend.pid
fi

# 4. Ouverture
echo -e "${GREEN}🚀 Tout est prêt ! Ouverture du dashboard...${NC}"
open "http://localhost:3000"

# 5. Préchauffage (Warmup) en arrière-plan
# On visite toutes les pages silencieusement pour forcer leur compilation
(
    echo -e "${BLUE}Préchauffage des pages en arrière-plan...${NC}"
    sleep 3 # Laisser le temps au navigateur de s'ouvrir
    
    # Liste des pages à compiler
    pages=("recoltes" "ventes" "achats" "salaries" "journal" "planning" "inventaire")
    
    for page in "${pages[@]}"; do
        # On lance la requête et on attend qu'elle finisse (compilation)
        curl -s "http://localhost:3000/$page" > /dev/null
    done
    
    echo -e "${GREEN}✅ Toutes les pages sont pré-chargées et prêtes !${NC}"
) &

# Maintenir le script actif
wait
