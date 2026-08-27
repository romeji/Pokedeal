import { ItemExplorer } from "@/components/items/ItemExplorer";

export default function ItemsPage() {
  return (
    <main className="p-5 md:p-10">
      <p className="eyebrow">Catalogue Cardmarket</p>
      <h1 className="mt-2 font-display text-4xl font-bold">Recherche de prix</h1>
      <p className="mt-2 max-w-2xl text-slate-400">
        Recherche une carte ou un produit Pokémon, consulte son dernier prix disponible
        et ajoute-le à tes favoris pour prioriser les alertes.
      </p>
      <ItemExplorer />
    </main>
  );
}
