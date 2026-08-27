# Base PostgreSQL partagée entre le PC, la PWA et Vercel

## Architecture retenue

La PWA ne se connecte jamais directement à PostgreSQL. Le navigateur appelle
les pages/routes Next.js en HTTPS ; ces fonctions utilisent Prisma côté serveur.
Le PC (Vintrack, Cardmarket, pipeline), Vercel et le tableau de bord pointent
vers la même base PostgreSQL cloud avec `DATABASE_URL`.

```text
Workers du PC ─┐
               ├── PostgreSQL cloud partagé
Vercel/Next.js ┘              ↑
       ↑                      │
       └──── PWA en HTTPS ────┘ (via Next.js uniquement)
```

Ne jamais ouvrir le port 5432 de la box Internet et ne jamais placer
`DATABASE_URL` dans du code client ou une variable `NEXT_PUBLIC_*`.

## Fournisseur conseillé pour la V1

Neon via **Vercel → Storage → Create Database** : PostgreSQL standard,
connexion poolée adaptée aux fonctions serverless et intégration automatique
des variables d'environnement. Choisir une région européenne proche de la
région Vercel.

Le forfait gratuit est limité à 0,5 Go. La base locale actuelle occupe déjà
environ 58,5 Mo après une journée et PokéDeal ajoute jusqu'à 78 220 prix par
jour. Configurer en cloud :

```env
CARDMARKET_PRICE_RETENTION_DAYS="7"
```

Pour conserver un historique plus long, utiliser un forfait avec davantage de
stockage ou réduire la fréquence/granularité des snapshots.

## Mise en service

1. Dans le projet Vercel PokéDeal : **Storage → Create Database → Neon**.
2. Sélectionner le plan voulu et une région européenne, puis connecter la base
   au projet pour Production, Preview et Development selon le besoin.
3. Vérifier que Vercel a créé une variable `DATABASE_URL` poolée.
4. Depuis le PC, récupérer la même URL dans `.env` (ne jamais la commiter).
5. Appliquer le schéma et initialiser les données :

```powershell
npx prisma migrate deploy
npm run prisma:seed
npm run cardmarket:sync
npm run db:check
```

6. Redéployer Vercel. `/admin/system` doit afficher **Cloud partagée** et
   `/api/health/database` doit répondre avec `"ok": true`.

Après le basculement, PostgreSQL Docker reste un secours local. Il ne faut pas
faire fonctionner simultanément deux bases comme sources principales : tous
les workers doivent utiliser la même `DATABASE_URL` cloud.
