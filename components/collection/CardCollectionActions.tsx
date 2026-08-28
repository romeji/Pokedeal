"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Binder = { id: string; name: string };

export function CardCollectionActions({ cardId, authenticated }: { cardId: string; authenticated: boolean }) {
  const [binders, setBinders] = useState<Binder[]>([]);
  const [binderId, setBinderId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (authenticated) fetch("/api/collections").then((response) => response.json()).then((rows: Binder[]) => { setBinders(rows); setBinderId(rows[0]?.id ?? ""); }).catch(() => undefined); }, [authenticated]);
  async function add() {
    if (!authenticated) { window.location.assign("/login"); return; }
    if (!binderId) { setMessage("Crée d’abord une collection."); return; }
    setBusy(true); setMessage("");
    const response = await fetch(`/api/collections/${binderId}/entries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "CARD", cardId, quantity, purchasePrice: purchasePrice === "" ? null : Number(purchasePrice), increment: true }) });
    const body = await response.json(); setBusy(false);
    setMessage(response.ok ? "Carte ajoutée à ta collection." : body.error || "Ajout impossible");
  }
  if (!authenticated) return <Link href="/login" className="button-primary">Connexion pour ajouter</Link>;
  if (!binders.length) return <Link href="/collection?create=1" className="button-primary">＋ Créer ma première collection</Link>;
  return <div className="card-collection-actions"><select className="neu-input" value={binderId} onChange={(event) => setBinderId(event.target.value)}>{binders.map((binder) => <option value={binder.id} key={binder.id}>{binder.name}</option>)}</select><input className="neu-input" type="number" min="1" max="999" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} aria-label="Quantité" /><input className="neu-input" type="number" min="0" step="0.01" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} placeholder="Prix d’achat €"/><button disabled={busy} className="button-primary" onClick={() => void add()}>{busy ? "Ajout…" : "＋ Ajouter"}</button>{message && <small>{message}</small>}</div>;
}
