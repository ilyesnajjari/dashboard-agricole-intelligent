# Dashboard Agricole Intelligent

Un tableau de bord complet pour la gestion d'une exploitation agricole avec API Django, frontend React/Next.js, base de données PostgreSQL, tâches asynchrones (Celery/Redis) et un module IA local pour la prévision des récoltes et des ventes.

## Fonctionnalités clés
- KPI: recettes, dépenses, profit net, rendement (kg/m²), ventes marché
- Graphiques: recettes vs dépenses, volumes, prix moyen/kg
- Pages: Production (fraises/légumes), Marché (Velleron), Achats, Comptabilité, Produits
- IA: prévisions (Prophet / scikit-learn), optimisation des stocks, alertes
- Exports: CSV/Excel/PDF (à venir)

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
Dockerfile.backend
Dockerfile.frontend
docker-compose.yml
```

## Démarrage rapide (dev)
1. Créer un fichier `.env` à partir de `.env.example` et ajuster les valeurs
2. Backend: `cd backend` puis `python manage.py runserver 0.0.0.0:8000`
3. Frontend: `cd frontend` puis `npm install` et `npm run dev`
4. Accéder aux apps: API sur http://localhost:8000 et Frontend sur http://localhost:3000

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