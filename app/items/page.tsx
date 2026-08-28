import { ItemExplorer } from "@/components/items/ItemExplorer";

export default function ItemsPage() {
  return (
    <main className="app-page maquette-page">
      <header className="maquette-topbar"><div><span>Catalogue Cardmarket</span><h1>Recherche de prix</h1></div><div className="topbar-actions"><a href="/collection/wishlist" className="circle-action" aria-label="Favoris">★</a></div></header>
      <p className="price-intro">
        Recherche une carte ou un produit Pokémon, consulte son dernier prix disponible
        et ajoute-le à tes favoris pour prioriser les alertes.
      </p>
      <ItemExplorer />
    </main>
  );
}
