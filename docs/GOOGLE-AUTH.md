# Connexion Google

PokéDeal utilise Auth.js et son adaptateur Prisma. Les favoris, collections,
master sets et classeurs libres sont isolés par utilisateur dans PostgreSQL.

## Configuration Google Cloud

1. Ouvrir Google Cloud Console, créer ou sélectionner un projet.
2. Configurer l'écran de consentement OAuth avec l'accueil public PokéDeal,
   `/privacy` et `/terms`.
3. Créer un identifiant **Application Web OAuth 2.0**.
4. Ajouter cette origine JavaScript autorisée :
   `https://pokedeal-snowy.vercel.app`.
5. Ajouter cette URI de redirection exacte :
   `https://pokedeal-snowy.vercel.app/api/auth/callback/google`.

Configurer ensuite dans Vercel, pour Production, Preview et Development :

```text
AUTH_SECRET=<valeur aléatoire longue et unique>
AUTH_GOOGLE_ID=<client id Google>
AUTH_GOOGLE_SECRET=<client secret Google>
AUTH_TRUST_HOST=true
```

Ne jamais commiter ces valeurs. Après leur ajout, redéployer l'application.
Le bouton de connexion est désactivé tant que la configuration est incomplète.

Pour le développement local, ajouter aussi l'origine `http://localhost:3000`
et l'URI `http://localhost:3000/api/auth/callback/google` dans le même client
Google, ou utiliser un client OAuth distinct.

L'application ne demande que le profil de base et l'adresse e-mail. Elle ne
demande aucun accès à Gmail, Drive ou aux autres données Google.
