# PokéDeal — audit produit et feuille de route

## Positionnement actuel

PokéDeal réunit désormais deux produits qui se renforcent : détection de bonnes
affaires Vinted et gestion d'une collection valorisée. La différence utile face
aux trackers classiques est la boucle complète : détecter, décider, acquérir,
classer puis suivre la valeur.

## Fonctions déjà opérationnelles

- Plusieurs classeurs : collection globale, sélection libre, master set cartes
  et master set items.
- Checklist multilingue et visuels HD TCGdex, avec variantes disponibles dans
  la fiche source.
- Liaison à l'identifiant produit Cardmarket et valorisation par le Price Guide
  local lorsqu'elle est disponible.
- Progression, pièces manquantes, quantités, état, prix d'achat et historique de
  valeur.
- Interface responsive PWA, navigation tactile et données partagées via Neon.
- Détection Vinted, analyse Gemini, filtres anti-contrefaçon, scoring et alertes
  Telegram/Discord.

## Priorités pour atteindre le niveau des leaders

### P0 — confiance et comptes

1. Remplacer la clé administrateur unique par une authentification multi-utilisateur
   (passkey ou email magique) et isoler toutes les données par `userId`.
2. Sauvegarde/export CSV et restauration complète de la collection.
3. Journal d'audit des ajouts, retraits et changements de valeur.

### P1 — vitesse de saisie

1. Scan photo/OCR d'une carte et scan d'une page entière de classeur.
2. Ajout en masse, import Collectr/TCG Collector et gestion des doublons.
3. Gestion complète des variantes : normale, reverse, holo, première édition,
   langue, gradation et numéro de certification.
4. Plan physique du classeur avec format 3×3/4×3 et emplacement exact.

### P1 — portefeuille

1. Courbe quotidienne globale et par classeur, performance 7/30/90 jours.
2. Plus-value réalisée, frais, coût moyen pour plusieurs exemplaires et ROI.
3. Coût estimé pour terminer un master set et alertes sur les cartes manquantes.
4. Sources complémentaires de ventes réellement conclues pour contrôler les
   prix extrêmes, sans remplacer Cardmarket comme oracle européen principal.

### P2 — collection sociale et transaction

1. Wishlist, classeur d'échange et lien public partageable.
2. Comparaison automatique entre doublons disponibles et cartes manquantes.
3. Alertes PokéDeal ciblées sur les éléments manquants d'un master set.
4. Mode exposition plein écran et QR privé pour montrer un classeur.

### P2 — qualité catalogue

1. Synchronisation planifiée des métadonnées TCGdex dans une table cache afin
   de conserver l'application utilisable hors ligne.
2. Correspondance contrôlée français/anglais/japonais et revue manuelle des
   associations ambiguës.
3. Enrichissement photo des items scellés, car le fichier officiel Cardmarket
   ne contient pas leurs images.

## Règle produit

Une cotation doit toujours afficher sa source, sa date et son niveau de
confiance. Une image ou un prix absent doit rester explicitement absent plutôt
que d'être inventé.
