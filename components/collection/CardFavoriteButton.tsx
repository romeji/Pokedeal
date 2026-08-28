"use client";

import { useState } from "react";

export function CardFavoriteButton({ cardId, initialFavorite, authenticated }: { cardId: string; initialFavorite: boolean; authenticated: boolean }) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle() {
    if (!authenticated) { window.location.assign("/login"); return; }
    setBusy(true); setMessage("");
    const response = await fetch(favorite ? `/api/wishlist?externalId=${encodeURIComponent(cardId)}` : "/api/wishlist", favorite ? { method: "DELETE" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ externalId: cardId }) });
    if (response.ok) setFavorite((value) => !value);
    else setMessage((await response.json()).error || "Action impossible");
    setBusy(false);
  }

  return <div><button type="button" disabled={busy} className={`neu-button ${favorite ? "text-amber-300" : ""}`} onClick={() => void toggle()}>{favorite ? "★ Dans mes souhaits" : "☆ Ajouter aux souhaits"}</button>{message && <small className="mt-2 block text-rose-300">{message}</small>}</div>;
}
