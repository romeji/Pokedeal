"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BinderDetail, BinderWorkspace } from "@/components/collection/CollectionStudio";

export function BinderPage({ id }: { id: string }) {
  const [detail, setDetail] = useState<BinderDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    const response = await fetch(`/api/collections/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Classeur indisponible");
    else { setDetail(data as BinderDetail); setError(""); }
    setBusy(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  return <main className="app-page maquette-page portfolio-page">
    <header className="maquette-topbar"><div><span>Ma collection</span><h1>Classeur</h1></div><Link href="/portfolio" className="circle-action" aria-label="Retour au portefeuille">←</Link></header>
    {error && <div className="loading-panel">{error}</div>}
    {!detail && !error && <div className="loading-panel">Ouverture du classeur…</div>}
    {detail && <BinderWorkspace detail={detail} busy={busy} refresh={load} />}
  </main>;
}
