# Design system PokéDeal

Source visuelle canonique : `pokedeal-maquette (1).html` fourni par Jérôme.

## Règle

Toute nouvelle interface doit reprendre les variables et composants globaux de `app/globals.css`. Il ne faut pas introduire un second thème cyan, glassmorphism ou Web3 parallèle.

## Fondations exactes de la maquette

- Fond d'application : `#262b36`
- Fond extérieur bureau : `#111318`
- Surfaces secondaires : `#2a2f3b` et `#2e3442`
- Ombre foncée : `#14161c`
- Ombre claire : `#343c4c`
- Accent principal : `#5b8def`
- Accent clair : `#7aa2ff`
- Succès : `#3ddc97`
- Danger : `#ff6b7a`
- Avertissement : `#ffb84c`
- Rayons : 12, 18 et 26 px
- Carte relevée : `8px 8px 16px #14161c, -8px -8px 16px #343c4c`
- Champ enfoncé : ombres internes de 5 px foncée et claire
- Titres : Space Grotesk
- Texte courant : Inter

## Composants canoniques

- `.neu-raised` / `.neu-card` : surface relevée
- `.neu-inset` / `.neu-input` : surface enfoncée
- `.neu-button` : action secondaire relevée
- `.button-primary` : action bleue pressée
- `.tabswitch` : navigation segmentée
- `.setting-row` : ligne de réglage ou de profil
- `.price-card` / `.price-row` : produit en grille ou en liste
- `.deal-card` : deal complet
- `.catalog-card` : carte Pokémon
- `.app-modal` : feuille basse sur mobile, fenêtre arrondie sur bureau

## Éléments fonctionnels absents de la maquette originale

Ces éléments sont conservés, mais doivent utiliser le même langage visuel :

1. Connexion Google et avatar de compte : bouton relevé 44 px, rayon 16 px.
2. Configuration administrateur : lignes de réglages identiques à l'écran Profil.
3. Imports Cardmarket : blocs relevés, formulaires enfoncés, action principale bleue.
4. Moniteurs Vintrack et filtres anti-contrefaçon : mêmes cartes et lignes de réglage.
5. Analyse photo Gemini : bouton relevé dans la barre de recherche, résultat dans une feuille basse.
6. Vue grille/liste des prix : contrôle segmenté enfoncé en haut à droite.
7. Fiche article et courbe historique : grande carte portefeuille relevée, courbe bleue.
8. Comparaison Cardmarket/Vinted/eBay : lignes enfoncées dans une carte relevée.
9. Achat, vente, quantité et P&L : formulaires enfoncés et boutons bleu/succès.
10. Historique des ventes : lignes de type portefeuille avec action danger rose.
11. Pagination et filtres des deals : barre enfoncée et boutons relevés.
12. Décisions Valider/Acheté/Ignorer : bleu, vert et rose issus des variables de la maquette.
13. Blocs et séries dynamiques TCGdex : tuiles 2 ou 3 colonnes avec ombres exactes de la maquette.
14. Progression réelle d'un master set : barre bleue de 4 px au bas de la tuile.
15. Wishlist synchronisée : ligne de souhait de la maquette avec étoile jaune.
16. Navigation bureau : extrapolation du menu mobile, sur une barre latérale neumorphique.
17. PWA responsive : même barre basse que la maquette, avec safe-area iOS/Android.
18. Messages de chargement et d'erreur : surfaces enfoncées, sans glassmorphism.

## Interdits

- Fond noir bleuté `#080d14` comme surface principale
- Cartes translucides ou glassmorphism
- Grandes aurores cyan/violettes
- Bordures cyan lumineuses
- Ombres uniquement noires sans contre-ombre claire
- Nouveau composant sans utiliser les variables globales ci-dessus
