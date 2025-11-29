# Dashboard Agricole Intelligent

Un tableau de bord complet pour la gestion d'une exploitation agricole avec API Django, frontend React/Next.js, base de données SQLite et un module IA local pour la prévision des récoltes et des ventes.

## Fonctionnalités clés
- KPI: recettes, dépenses, profit net, rendement (kg/m²), ventes marché
- Graphiques: recettes vs dépenses, volumes, prix moyen/kg
- Pages: Production (fraises/légumes), Marché (Velleron), Achats, Produits
- IA: prévisions (Prophet / scikit-learn), optimisation des stocks, alertes
- Exports: PDF (à venir)

## Structure du repo
```
backend/            # Django REST API
  apps/
    products/
    harvests/
    sales/
    purchases/
    accounting/
    ai_module/
  api/              # serializers, views, urls
frontend/           # Next.js dashboard
  pages/
  components/
  api/              # wrappers Axios
.env.example
```

## Installation et Utilisation

### 1. Utilisation Quotidienne
Pour lancer l'application (Backend + Frontend) :
```bash
./lancer_app.sh
```
L'application s'ouvrira automatiquement dans votre navigateur.

### 2. Migration vers une autre machine
Pour installer le projet sur un nouvel ordinateur (Mac/Linux) :

**Ce qu'il faut copier :**
*   📁 `backend/`
*   📁 `frontend/`
*   📄 `lancer_app.sh`
*   📄 `setup_deployment.sh`
*   📄 `.env`
*   📄 `backend/db.sqlite3` (Optionnel : copiez-le uniquement si vous voulez conserver vos données)

**Ce qu'il NE FAUT PAS copier :**
*   `node_modules/`
*   `.next/`
*   `.venv/` ou `venv/`
*   `__pycache__/`

**Procédure d'installation sur la nouvelle machine :**
1.  Ouvrez un terminal dans le dossier du projet.
2.  Rendez les scripts exécutables :
    ```bash
    chmod +x setup_deployment.sh lancer_app.sh
    ```
3.  Lancez l'installation automatique :
    ```bash
    ./setup_deployment.sh
    ```
4.  Une fois terminé, lancez l'application avec `./lancer_app.sh`.

### 3. Démarrage Manuel (Développement)
Si vous préférez lancer les serveurs séparément :
1.  **Backend** : `source .venv/bin/activate && cd backend && python manage.py runserver`
2.  **Frontend** : `cd frontend && npm run dev`
3.  Accès : API sur http://localhost:8000 et Frontend sur http://localhost:3000

## Roadmap
- [ ] Modèles et endpoints de base (produits, récoltes, ventes, achats, compta)
- [ ] UI Dashboard et pages dédiées
- [ ] IA: prévisions locales + tâches planifiées
- [ ] Exports et rapports

## Licence
MIT

## UX et Design
- Thème MUI avec palette agricole, mode clair/sombre (toggle dans la barre supérieure)
- Layout commun avec navigation vers Produits, Récoltes, Ventes
- Graphes agrégés avec légende et formatage d’axe selon période

## Tests end-to-end (Playwright)
- Installer Playwright dans `frontend` puis exécuter:
  - `npm install`
  - `npx playwright install`
  - `npm run dev` (dans un terminal)
  - `npm run test:e2e` (dans un autre terminal)

## Captures d’écran (à ajouter)
- Accueil (thème clair/sombre)
- Récoltes: rendements et volumes
- Ventes: prix moyen, volumes, revenus