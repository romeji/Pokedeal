# Vinted — Vérification des sources (Phase 6, avant codage)

Conformément à la section 6 et à la règle absolue de la section 29
("ne jamais contourner CAPTCHA, authentification, protections anti-bot ou
limitations techniques"), voici ce qui a été vérifié avant d'écrire un
`VintedProvider` réel.

## 1. Pas d'API publique pour ce cas d'usage

(cite index="21-1">Vinted ne propose pas d'API publique pour accéder aux données d'annonces, et son API interne nécessite une authentification et n'est pas documentée pour un usage tiers.</cite> (cite index="22-1">Vinted propose bien une API officielle — "Vinted Pro Integrations" — mais elle sert à gérer son propre inventaire de vendeur (créer/modifier/supprimer ses propres articles, webhooks de vente, commandes), pas à consulter les annonces des autres.</cite>

➡️ Aucune voie officielle ne permet de surveiller les annonces Pokémon
d'autres utilisateurs, quel que soit le cas d'usage (perso ou non).

## 2. Le seul chemin technique restant implique de contourner l'anti-bot

(cite index="23-1">L'API interne de Vinted n'est pas documentée et change sans préavis, et elle est protégée par plusieurs couches de détection anti-bot de plus en plus agressives.</cite> (cite index="19-1">Scraper les données publiques est généralement légal en UE/US, mais viole les Conditions d'Utilisation de Vinted.</cite> (cite index="25-1">Les CGU de Vinted nomment explicitement les outils logiciels externes, bots, programmes de scraping/crawling comme interdits.</cite>

Concrètement, tout `VintedProvider` fonctionnel aujourd'hui nécessiterait :
- de contourner la protection anti-bot (Datadome), via rotation de proxys
  résidentiels et usurpation d'empreinte navigateur ;
- ou de payer un service tiers (Apify "Vinted Smart Scraper", ScrapeBadger,
  Bright Data...) qui fait exactement ça en coulisses, pour le compte de
  l'utilisateur.

➡️ Les deux options reviennent à contourner une protection anti-bot —
directement ou en le sous-traitant. **C'est explicitement interdit par le
brief (section 6/29), sans exception liée à l'usage personnel.**
Contrairement au point Cardmarket (Phase 2), ce n'est pas une clause CGU
ambiguë qu'on peut choisir d'assumer en connaissance de cause : c'est une
règle absolue du projet, et une pratique que je n'implémenterai pas.

## 3. Décision retenue pour la V1

- `VintedProvider` reste un stub qui lève une erreur explicite — il ne sera
  implémenté que si Vinted ouvre un jour un accès légitime aux données
  d'annonces (API publique, partenariat, etc.).
- `ManagedVintedProvider` (Apify/ScrapeBadger) reste également un stub —
  ce n'est pas une solution plus "propre", juste le même contournement
  sous-traité à quelqu'un d'autre.
- `ProviderComplianceReview("vinted").status` est `DISABLED`. Les Termes et
  conditions officiels consultés le 27 août 2026 interdisent explicitement
  les bots, le scraping, le crawling et l'extraction de données sans
  autorisation de Vinted : https://www.vinted.fr/terms-and-conditions
  (section 6, « Obligations et interdictions »).
- Toute la Phase 4/5 reste testable de bout en bout via `MockVintedProvider`.

## 4. Piste alternative plus défendable, non implémentée ici

Si tu veux un jour une vraie collecte perso sans violer les CGU de la même
façon : une **extension navigateur** qui lit le DOM pendant que tu navigues
normalement sur Vinted (session authentifiée, vraie empreinte navigateur,
aucune usurpation, aucun contournement actif de Datadome) est
architecturalement plus défendable qu'un scraper serveur — parce qu'elle
ne prétend pas être autre chose qu'un navigateur humain. Elle reste dans
une zone grise vis-à-vis des CGU ("outils logiciels externes" est nommé),
mais elle n'implique pas de contourner une protection technique. C'est un
projet à part entière (extension + petit backend de réception), pas codé
dans cette itération — à en discuter si tu veux vraiment avancer sur la
collecte Vinted.

## Sources consultées

- dev.to/datakaz — "How to Scrape Vinted in 2026 (Without Getting Blocked)"
- dev.to/datakaz — "Vinted Scraper: How to Extract Listing Data Automatically in 2026"
- dev.to/datakaz — "The Vinted Arbitrage War"
- scrapebadger.com/blog — "Best Vinted API 2026"
- smashvintage.com/blog — "Does Vinted ban sellers for using bots or external tools?"
- redrip.app/en/blog — "Is automating Vinted legal? The real answer in 2026"
