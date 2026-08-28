# Fonctions Vintrack exploitables dans PokéDeal

Référence auditée : projet amont `JakobAIOdev/Vintrack-Vinted-Monitor`.
PokéDeal réutilise ses principes d'architecture sans réécrire son interface.

## Priorité haute

- **Workers Go par région et sessions isolées** : consolider le pont actuel
  pour qu'une erreur régionale ne bloque pas les autres recherches.
- **Tentatives bornées et temporisation** : limiter proprement les nouvelles
  tentatives, afficher l'état de santé et éviter les boucles agressives.
- **Filtres riches par moniteur** : requête, fourchette de prix, catégorie,
  marque, couleur, taille, état et pays vendeur, puis passage dans les filtres
  anti-contrefaçon/produit vide propres à PokéDeal.
- **Flux SSE** : pousser les nouvelles annonces au dashboard sans recharger la
  page et montrer leur progression analyse → cotation → opportunité.
- **Notifications par moniteur** : canal Discord/Telegram, seuil et activation
  configurables par recherche et, à terme, par utilisateur.

## Priorité moyenne

- **Déduplication atomique Redis** : utile si plusieurs workers sont lancés ;
  PostgreSQL suffit pour l'instance unique actuelle.
- **Pool réseau avec santé/cooldown** : utile sur un hébergement permanent,
  avec uniquement des accès autorisés et sans contourner CAPTCHA ou limites.
- **OpenAPI et métriques opérationnelles** : contrats stables entre le worker
  et Next.js, débit, latence, erreurs, annonces filtrées et dates de dernier
  succès visibles dans l'administration.
- **Rôles Auth.js** : séparer propriétaire, utilisateur et lecture seule quand
  la PWA devient multi-utilisateur.

## À différer

- Les actions liées à un compte Vinted (favoris, offres, messages ou achat)
  impliquent des identifiants sensibles et un risque opérationnel supérieur.
- L'extension navigateur de synchronisation n'est pas nécessaire tant que le
  pont local et les moniteurs suffisent.

Aucune fonction ne doit automatiser le contournement d'un CAPTCHA, d'une
authentification ou d'une limitation technique. Une annonce non vérifiable doit
passer en revue plutôt que produire une alerte approximative.
