"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";

type Item = {
  id: string;
  cardmarketProductId: number;
  name: string;
  kind: string;
  setName: string | null;
  setCode: string | null;
  imageUrl: string | null;
  price: {
    probable: number;
    low: number | null;
    trend: number | null;
    retrievedAt: string;
  } | null;
  favorite: boolean;
  priceSource: string | null;
};

export function ItemExplorer() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [googleConfigured, setGoogleConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then((data: { authenticated?: boolean; googleAuthConfigured?: boolean }) => { setAuthenticated(Boolean(data.authenticated)); setGoogleConfigured(Boolean(data.googleAuthConfigured)); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!favoritesOnly && query.trim().length < 2) {
      setItems([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setMessage("");
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (favoritesOnly) params.set("favorites", "true");
        const response = await fetch(`/api/items?${params}`);
        if (response.status === 401) {
          setShowLogin(true);
          setMessage("Connecte-toi pour afficher tes favoris.");
          setItems([]);
          return;
        }
        if (!response.ok) throw new Error("Recherche indisponible");
        setItems((await response.json()) as Item[]);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Recherche indisponible");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, favoritesOnly, authenticated]);

  async function login(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setToken("");
    if (!response.ok) {
      setMessage("Clé administrateur incorrecte.");
      return;
    }
    setAuthenticated(true);
    setShowLogin(false);
    setMessage("Connexion sécurisée activée sur cet appareil.");
  }

  async function toggleFavorite(item: Item) {
    if (!authenticated) {
      setShowLogin(true);
      setMessage("Connecte-toi une fois pour modifier les favoris partagés.");
      return;
    }
    const response = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: item.id, favorite: !item.favorite }),
    });
    if (!response.ok) {
      if (response.status === 401) {
        setAuthenticated(false);
        setShowLogin(true);
      }
      setMessage("Impossible de modifier ce favori.");
      return;
    }
    setItems((current) =>
      current
        .map((entry) =>
          entry.id === item.id ? { ...entry, favorite: !entry.favorite } : entry,
        )
        .filter((entry) => !favoritesOnly || entry.favorite),
    );
  }

  return (
    <section className="mt-8">
      <div className="surface p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            className="input min-w-0 flex-1"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex. Dracaufeu, Pikachu, ETB 151…"
            aria-label="Rechercher un produit Pokémon"
          />
          <button
            className={favoritesOnly ? "button-primary" : "nav-link border border-slate-700/60"}
            onClick={() => setFavoritesOnly((value) => !value)}
          >
            ★ Mes favoris
          </button>
          <button className="nav-link" onClick={() => setShowLogin((value) => !value)}>
            {authenticated ? "✓ Connecté" : "🔒 Connexion"}
          </button>
        </div>

        {showLogin && !authenticated && (
          <div className="mt-4 rounded-2xl border border-white/5 bg-slate-950/30 p-4"><button disabled={!googleConfigured} className="button-primary h-11 w-full" onClick={() => signIn("google", { callbackUrl: "/items" })}>{googleConfigured ? "G  Continuer avec Google" : "Connexion Google à configurer"}</button><form onSubmit={login} className="mt-3 flex flex-col gap-3 md:flex-row">
            <input
              className="input min-w-0 flex-1"
              type="password"
              autoComplete="current-password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Clé administrateur ADMIN_TOKEN"
              required
            />
            <button className="button-primary" type="submit">Se connecter</button>
          </form></div>
        )}
        {message && <p className="mt-3 text-sm text-cyan-200">{message}</p>}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.id} className="surface overflow-hidden">
            <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-800 to-slate-950">
              {item.imageUrl ? (
                // Les images proviennent du catalogue enrichi ou d'une annonce Vinted déjà analysée.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain p-3" />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl opacity-50">◓</div>
              )}
              <button
                className="absolute right-3 top-3 rounded-full border border-white/20 bg-slate-950/80 px-3 py-2 text-xl backdrop-blur"
                onClick={() => toggleFavorite(item)}
                aria-label={item.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <span className={item.favorite ? "text-amber-300" : "text-slate-400"}>★</span>
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs uppercase tracking-wider text-cyan-300">{formatKind(item.kind)}</p>
              <h2 className="mt-2 line-clamp-2 min-h-12 font-semibold">{item.name}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {item.setName ?? item.setCode ?? `Cardmarket #${item.cardmarketProductId}`}
              </p>
              {item.price ? (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-slate-500">Prix probable</span>
                    <strong className="block text-2xl text-emerald-300">
                      {euro(item.price.probable)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Prix bas</span>
                    <strong className="block text-lg">{euro(item.price.low)}</strong>
                  </div>
                  <p className="col-span-2 text-xs text-slate-500">
                    {item.priceSource} · mis à jour le {new Date(item.price.retrievedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-sm text-slate-500">Prix indisponible</p>
              )}
            </div>
          </article>
        ))}
      </div>

      {!loading && !items.length && (query.trim().length >= 2 || favoritesOnly) && (
        <div className="surface mt-6 p-10 text-center text-slate-400">Aucun item trouvé.</div>
      )}
      {loading && <div className="mt-6 text-center text-cyan-200">Recherche…</div>}
    </section>
  );
}

function euro(value: number | null) {
  return value === null ? "—" : `${value.toFixed(2)} €`;
}

function formatKind(kind: string) {
  return kind.toLowerCase().replaceAll("_", " ");
}
