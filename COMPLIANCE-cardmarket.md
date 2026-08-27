# Cardmarket — Vérification des sources (Phase 2, avant codage)

Conformément à la section 3 et à la règle absolue de la section 29 ("ne jamais
inventer d'API, endpoint, URL ou donnée"), voici ce qui a été vérifié via
recherche web avant d'écrire le moindre importeur.

## 1. Ancienne API officielle (api.cardmarket.com/ws)

- Cardmarket indique explicitement : **"Currently, we are not accepting
  applications for access to the Cardmarket API."**
  (source : help.cardmarket.com/en/cardmarket-api)
- Cette voie est donc **fermée** pour un nouveau projet — inutile de la
  cibler pour la V1.

## 2. Price Guide + Product Catalogue téléchargeables (voie retenue)

- Annonce officielle Cardmarket (05.06.2024) : le Price Guide et le Product
  Catalogue sont désormais **téléchargeables gratuitement pour tous les
  utilisateurs**, tous jeux confondus. Auparavant réservés aux utilisateurs
  API.
  (source : news.cardmarket.com, "We're Making the Price Guide and Product
  Catalogue Available for Download!")
- Les pages sont **scopées par jeu et par langue d'interface**, pas une URL
  générique unique. Pour Pokémon en anglais :
  - Page d'index : `https://www.cardmarket.com/en/Pokemon/Data`
  - Price Guide : `https://www.cardmarket.com/en/Pokemon/Data/Price-Guide`
  - Product Catalogue : `https://www.cardmarket.com/en/Pokemon/Data/Product-List`
  (La page générique `cardmarket.com/Data/Download` mentionnée dans
  l'annonce d'origine renvoie une 404 aujourd'hui — l'URL a changé depuis
  2024, ce qui est cohérent avec le reste du site scopé par jeu.)
- Fréquence : **Price Guide mis à jour une fois par jour** ; **Product
  Catalogue mis à jour à chaque nouvelle sortie**. Les fichiers peuvent donc
  ne pas être 100% à jour.
- Conséquence annoncée par Cardmarket : les anciens endpoints API liés à ces
  fichiers ont été dépréciés puis supprimés ~6 mois après cette annonce.

➡️ C'est la source à utiliser pour `CardmarketCatalogImporter` /
`CardmarketPriceImporter`.

## 3. Statut retenu — usage personnel autorisé par Jack

Jack a autorisé d'avance l'usage en zone grise **pour un usage strictement
personnel** (alertes Discord privées, pas de republication publique ni
commerciale). `ProviderComplianceReview("cardmarket").status` est donc passé
à `APPROVED`, scopé à cet usage.

Ce qui reste vrai et non résolu : les CGU Cardmarket imposent un accord écrit
préalable pour <em>"the presentation of the trading cards and their
respective prices"</em>. Si ce projet évolue un jour vers un usage public,
partagé avec d'autres personnes, ou commercial, il faudra revenir sur ce
point avant d'activer quoi que ce soit à cette échelle-là — remettre le
statut à `REVIEW_REQUIRED` et clarifier avec Cardmarket.

## 4. Format réel des fichiers — vérifié sur les fichiers fournis par Jack

Jack a fourni trois fichiers réels téléchargés depuis les pages Pokémon :
`products_singles_6.json` (73 186 singles), `products_nonsingles_6.json`
(5 034 produits scellés), `price_guide_6.json` (78 220 lignes de prix).
Le format ci-dessous est donc **vérifié**, pas supposé.

```json
// products_singles_6.json / products_nonsingles_6.json
{
  "version": 1,
  "createdAt": "2026-08-26T12:20:28+0200",
  "products": [
    { "idProduct": 273532, "idCategory": 51, "categoryName": "Pokémon Single",
      "idExpansion": 1585, "idMetacard": 340471, "name": "Weedle [Multiply]",
      "dateAdded": "0000-00-00 00:00:00" }
  ]
}

// price_guide_6.json
{
  "version": 1,
  "createdAt": "2026-08-26T12:20:28+0200",
  "priceGuides": [
    { "idProduct": 273532, "idCategory": 51,
      "avg": 0.16, "low": 0.02, "trend": 0.16,
      "avg1": 0.1, "avg7": 0.16, "avg30": 0.14,
      "avg-holo": 0.2, "low-holo": 0.1, "trend-holo": 0.65,
      "avg1-holo": 0.2, "avg7-holo": 0.47, "avg30-holo": 0.58 }
  ]
}
```

Constats structurants (ont changé le schéma Phase 1) :

- **Un seul espace d'idProduct** pour singles ET produits scellés —
  `idCategory` distingue le type (51 = Single, 52 = Booster, 53 = Display,
  1016 = Elite Trainer Box, etc.). Le schéma a donc été unifié en un seul
  modèle `CardmarketProduct` plutôt que deux tables séparées.
- **Aucun champ langue, ni numéro de carte, ni rareté** dans le catalogue.
  Le "151 Elite Trainer Box" n'a par exemple qu'un seul `idProduct`
  (719691) — pas de variante FR/JP/EN distincte au niveau produit.
- **Le Price Guide n'a pas de champ langue non plus** — un seul prix par
  `idProduct` (+ variante holo pour les singles). Conséquence concrète pour
  la section 5 du brief ("Pokémon 151 ETB FR ≠ Pokémon 151 ETB JP") : **ce
  fichier seul ne permet pas de différencier le prix FR du prix JP**. Il
  faudra soit accepter un seul "prix marché" par produit pour la V1 (au
  risque de sur/sous-estimer selon la langue réelle de l'annonce Vinted),
  soit trouver une source de prix par langue plus tard (section 4 : "prévoir
  d'autres sources").
- **`idExpansion` n'a pas de nom/code fourni dans ces fichiers** — juste un
  identifiant numérique Cardmarket. `PokemonSet` reste donc un stub
  (`name`/`code` nullable) tant qu'un export "Expansions" séparé n'est pas
  fourni. **Action requise** : si la même page de téléchargement Pokémon
  propose un fichier Expansions, peux-tu me l'envoyer aussi ?
- `idCategory: 1654` correspond à deux `categoryName` différents dans le
  fichier ("Pokémon Pokémon Sets" et "PCG Set") — mappé en `OTHER` par
  prudence plutôt que deviné.

`CardmarketCatalogImporter` et `CardmarketPriceImporter` sont maintenant
écrits contre ce format réel (voir `lib/cardmarket/`).

## Sources consultées

- https://help.cardmarket.com/en/cardmarket-api
- https://news.cardmarket.com/en/Magic/were-making-the-price-guide-and-product-catalogue-available-for-download
- https://www.cardmarket.com/en/Policies/GeneralTermsAndConditions
