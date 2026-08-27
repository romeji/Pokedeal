# Pokémon Deal Scanner

Surveillance des annonces Pokémon sur Vinted, identification par vision, comparaison
avec Cardmarket, calcul du profit/ROI, et alerte Discord automatique.

## État d'avancement

- [x] **Phase 1 — Foundation** : Next.js (App Router) + TypeScript + Tailwind,
      PostgreSQL via Docker, schéma Prisma complet, interfaces des 4 Providers
      (Marketplace / Price / Vision / Notification), MockVintedProvider,
      dashboard placeholder, garde-fou de conformité (`ProviderComplianceReview`).
- [x] **Phase 2 — Cardmarket (importeurs réels écrits)** :
      ancienne API fermée aux nouvelles demandes, Price Guide + Product
      Catalogue téléchargeables gratuitement depuis les pages `/Data/*`
      scopées par jeu. Jack a autorisé l'usage en zone grise pour un usage
      strictement personnel. `CardmarketCatalogImporter` et
      `CardmarketPriceImporter` sont écrits contre le format réel des
      fichiers fournis (voir `COMPLIANCE-cardmarket.md`). Schéma Prisma mis
      à jour en conséquence (modèle `CardmarketProduct` unifié). Point
      ouvert : pas de langue dans ces exports (impact section 5), pas de
      nom/code de set (besoin d'un export "Expansions" à fournir).
- [x] **Phase 3 — Price Engine** : `PriceEngine` (implémente `PriceProvider`)
      branché sur `PriceSnapshot`/`CardmarketProduct` réels. Fournit prix
      courant, fourchette optimiste/probable/prudente (pour l'Opportunity
      Engine, section 12-13), et évolution 7/30/90 jours calculée sur
      l'historique réel — jamais simulée : renvoie `null` tant qu'on n'a
      pas assez d'imports espacés dans le temps. `sampleSize` reste `null`
      (non fourni par le Price Guide, jamais inventé).
- [x] **Phase 4 — Gemini Vision + Product Matcher** : `GeminiVisionProvider`
      réel (endpoint REST `generateContent` + `responseSchema` JSON
      structuré, documentation officielle Google). Filtre texte bon marché
      avant tout appel (`lib/ai/pokemonFilter.ts`, section 9). Cache par
      hash d'image dans `ListingImage.visionResultRaw` (jamais ré-analysée
      deux fois). `ProductMatcher` (section 11) associe chaque item
      identifié à un `CardmarketProduct` par similarité de nom (Jaccard sur
      tokens) — pas de service payant, matching honnêtement approximatif
      pour la V1. `workers/ai/listing-analyzer.ts` orchestre tout le
      pipeline. **Point ouvert** : le nom exact du modèle Gemini "gratuit"
      change souvent en 2026 — `GEMINI_MODEL` est obligatoire, sans valeur
      par défaut, à vérifier dans Google AI Studio avant de lancer.
- [x] **Phase 5 — Opportunity Engine** : `OpportunityEngine` (sections
      12-13) calcule optimiste/probable/prudente pour les lots (jamais de
      somme aveugle des valeurs max), profit et ROI avec frais
      configurables (`.env`, jamais en dur). `OpportunityScorer` (section
      14) calcule un score 0-100 pondéré sur les seuls signaux réellement
      disponibles — `liquidityScore` reste `null` (Cardmarket ne fournit
      pas de volume de ventes) et le score est plafonné à 69 si un signal
      de confiance clé manque ("mieux vaut aucune alerte qu'une mauvaise
      alerte"). `workers/pricing/opportunity-scorer.ts` écrit `Opportunity`
      + `OpportunityScore`.
- [x] **Phase 6 — Vinted (provider réel) — bloqué par conformité, documenté** :
      recherche faite (voir `COMPLIANCE-vinted.md`) — aucune API publique
      pour ce cas d'usage, et le seul chemin technique restant (scraping)
      nécessite de contourner l'anti-bot Vinted (Datadome), directement ou
      via un service tiers payant (Apify, ScrapeBadger...). C'est interdit
      par une règle absolue du brief (section 6/29), sans exception liée à
      l'usage personnel — contrairement au point Cardmarket, ce n'est pas
      une clause qu'on peut choisir d'assumer. `VintedProvider` et
      `ManagedVintedProvider` restent des stubs, `ProviderComplianceReview`
      est `DISABLED`. Une piste alternative plus défendable
      (extension navigateur, session authentifiée réelle, aucun
      contournement anti-bot) est documentée mais non codée.
- [x] **Phase 7 — Discord + Telegram** : les deux implémentations sont
      interchangeables derrière `NotificationProvider`. Les workers
      `discord-notifier.ts` et `telegram-notifier.ts`
      applique les `AlertRule` actives (section 17) et le `Watchlist`
      (section 19) avant d'envoyer — aucune alerte tant que Jack n'a créé
      aucune règle ni entrée watchlist (fail-safe : silence plutôt que
      spam). Dédoublonnage (section 18) : une notification par
      `Opportunity` et par canal maximum, avec journal des tentatives et
      nouvelle tentative bornée en cas d'échec.
- [x] **Phase 8 — Workers + automatisation** : `runJob()` trace chaque
      exécution dans `WorkerRun` (status/startedAt/completedAt/error/
      retryCount, section 22). `workers/run-pipeline.ts` enchaîne collecte
      → analyse → scoring → notifications Discord et Telegram en une commande
      (`npm run pipeline:run-once`), à planifier via cron OS (gratuit,
      simple — pas d'orchestrateur distribué en V1). `/admin/system`
      (section 23) affiche les derniers jobs et le statut de conformité de
      chaque provider.

Ne pas sauter de phase : chaque phase doit être validée avant la suivante
(conformément au brief, section 26/29).

## Démarrage (Phase 1)

Prérequis : Node.js 20+, Docker.

```bash
npm install
cp .env.example .env          # puis compléter les clés réellement utilisées
npm run db:up                 # démarre PostgreSQL (Docker)
npx prisma migrate dev --name init
npm run prisma:seed           # initialise les statuts de conformité
npm run dev                   # http://localhost:3000/dashboard
```

## Importer les données Cardmarket (Phase 2)

Place les fichiers téléchargés depuis les pages `/Data/*` du jeu Pokémon
dans un dossier local `./data` (ignoré par git, voir `.gitignore`) :

```bash
npm run worker:catalog-import -- ./data/products_singles_6.json ./data/products_nonsingles_6.json
npm run worker:price-import -- ./data/price_guide_6.json
```

Le premier import doit toujours être le catalogue — le price guide ignore
silencieusement (et compte) les `idProduct` qu'il ne connaît pas encore
localement plutôt que de deviner leurs attributs.



- Il ne parle pas réellement à Vinted (`VintedProvider` est un stub qui lève une
  erreur explicite tant que `ProviderComplianceReview.status !== "APPROVED"`).
  Utiliser `MockVintedProvider` en attendant.
- Les importeurs Cardmarket lisent les exports JSON locaux fournis ; ils
  n'inventent aucun endpoint et n'utilisent pas de nouvelle clé API.
- `GeminiVisionProvider.analyzeImages` est implémenté, mais nécessite
  `GEMINI_API_KEY` et `GEMINI_MODEL` dans `.env`.
- Le dashboard affiche des données de démonstration, pas encore Prisma.

## Telegram

1. Crée un bot avec `@BotFather`, copie son token dans `TELEGRAM_BOT_TOKEN`.
2. Démarre une conversation avec le bot (ou ajoute-le au groupe/canal cible).
3. Renseigne l'identifiant dans `TELEGRAM_CHAT_ID`.
4. Vérifie l'envoi réel avec `npm run notification:test:telegram`.

Le pipeline envoie aussi sur Telegram lorsque les deux variables sont
présentes. Les secrets doivent rester dans `.env`, jamais dans
`.env.example` ni dans Git.

## Interface, imports et filtres

- `/dashboard` affiche les données Prisma réelles.
- `/library` conserve uniquement les opportunités à profit positif dont
  l'annonce n'est pas `SOLD`, `REMOVED` ou `EXPIRED`.
- `/admin/imports` importe les exports JSON Cardmarket par lots adaptés aux
  limites Vercel. L'accès exige `ADMIN_TOKEN`.
- `/admin/filters` gère les expressions personnalisées de rejet, de revue ou
  d'autorisation. Les faux/proxy, produits ouverts et emballages seuls sont
  déjà couverts ; Gemini ajoute ensuite son contrôle visuel.

## Vercel

Relier le dépôt à Vercel, connecter un PostgreSQL compatible serverless,
puis configurer `DATABASE_URL`, `ADMIN_TOKEN`, Gemini et les notifications.
Appliquer les migrations avec `npx prisma migrate deploy`. Docker reste local.

## Lanceur Windows

Le raccourci `Pokedeal` du Bureau ouvre un prévol graphique : Node, `.env`,
Docker, PostgreSQL, migrations, seed, tests, lint et build doivent tous être
cochés avant que le bouton de démarrage soit activé.

Ces limites sont volontaires : le brief demande explicitement de ne jamais
inventer d'API/endpoint/URL, et d'avancer phase par phase (sections 26 et 29).

## Automatisation (Phase 8, section 22)

Pas d'orchestrateur distribué en V1 — une seule commande enchaîne tout le
pipeline, à planifier via le cron de ton OS (gratuit, simple) :

```bash
npm run pipeline:run-once
```

Exemple de crontab (toutes les 15 minutes) :

```
*/15 * * * * cd /chemin/vers/pokemon-deal-scanner && npm run pipeline:run-once >> /var/log/pds.log 2>&1
```

Chaque étape écrit son statut dans `WorkerRun` (status/startedAt/
completedAt/error/retryCount, section 22), visible sur `/admin/system`
(section 23) avec l'état de conformité de chaque provider.

## Architecture (rappel section 2)

```
CARDMARKET → PRICE ENGINE
VINTED → NORMALIZER → GEMINI VISION → PRODUCT MATCHER → CARDMARKET PRODUCT
                                                              ↓
                                                   OPPORTUNITY ENGINE
                                                   (Profit / ROI / Risk / Score)
                                                              ↓
                                              DISCORD + TELEGRAM → DASHBOARD
```

Le cœur de l'application ne dépend jamais directement de Vinted, Gemini ou
Cardmarket — uniquement des interfaces dans `lib/marketplace/types.ts`,
`lib/pricing/types.ts`, `lib/ai/types.ts`, `lib/notifications/types.ts`.

## Structure

```
app/            routes Next.js (dashboard, opportunities, listings, ...)
lib/
  marketplace/  MarketplaceProvider + Vinted (réel/mock/managed)
  cardmarket/   importeurs catalogue + prix
  ai/           VisionProvider + Gemini
  pricing/      PriceProvider + moteur de prix
  scoring/      calcul du score d'opportunité
  notifications/ contrat NotificationProvider indépendant du canal
  discord/      implémentation Discord
  telegram/     implémentation Telegram Bot API
  compliance/   garde-fou ProviderComplianceReview
  database/     client Prisma
workers/        jobs listés section 22 (à implémenter phase par phase)
prisma/         schema.prisma + seed
```
