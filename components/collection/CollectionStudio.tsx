"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

type BinderType = "GLOBAL" | "CUSTOM" | "MASTER_CARDS" | "MASTER_ITEMS";
type Binder = {
  id: string; name: string; description: string | null; type: BinderType; setName: string | null;
  coverImageUrl: string | null; accentColor: string; owned: number; totalItems: number;
  target: number | null; progress: number | null; value: number; updatedAt: string;
  history: Array<{ value: number; recordedAt: string }>;
};
type BlockOption = { id: string; name: string; logo: string | null; releaseDate: string | null; setCount: number };
type SetOption = { id: string; name: string; logo: string | null; releaseDate: string | null; total: number };
type Target = {
  id: string; name: string; number?: string; imageUrl?: string | null; owned: boolean;
  kind: "CARD" | "ITEM"; productKind?: string; price?: number;
};
type Entry = Target & {
  externalId: string; productId?: string | null; variant: string; condition: string; quantity: number;
  purchasePrice: number | null; manualValue: number | null; unitValue: number; updatedAt: string;
  language: string; notes: string | null; grader: string | null; grade: string | null;
  certification: string | null; page: number | null; row: number | null; column: number | null;
};
type Activity = { id: string; action: string; entryName: string | null; details: unknown; createdAt: string };
export type BinderDetail = {
  binder: Pick<Binder, "id" | "name" | "description" | "type" | "setName" | "coverImageUrl" | "accentColor" | "target">;
  entries: Entry[]; targets: Target[]; value: number; history: Array<{ value: number; recordedAt: string }>;
  activities: Activity[];
};
type SearchResult = { id: string; name: string; localId?: string; imageUrl?: string | null; kind?: string; price?: number };

const TYPE_META: Record<BinderType, { label: string; kicker: string; icon: string }> = {
  GLOBAL: { label: "Collection globale", kicker: "Toutes séries confondues", icon: "✦" },
  CUSTOM: { label: "Classeur libre", kicker: "Ta sélection personnelle", icon: "◫" },
  MASTER_CARDS: { label: "Master set cartes", kicker: "Chaque carte de la série", icon: "◇" },
  MASTER_ITEMS: { label: "Master set items", kicker: "Scellés et objets de la série", icon: "⬡" },
};

export function CollectionStudio() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [binders, setBinders] = useState<Binder[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createdBinder, setCreatedBinder] = useState<{ id: string; setId: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const restoreInput = useRef<HTMLInputElement>(null);

  async function loadBinders() {
    const response = await fetch("/api/collections", { cache: "no-store" });
    if (response.status === 401) { setAuthenticated(false); return; }
    if (!response.ok) throw new Error("Portefeuille indisponible");
    const data = (await response.json()) as Binder[];
    setBinders(data);
  }

  useEffect(() => {
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then(async (data: { authenticated?: boolean; googleAuthConfigured?: boolean }) => {
        setGoogleConfigured(Boolean(data.googleAuthConfigured));
        const valid = Boolean(data.authenticated);
        setAuthenticated(valid);
        if (valid) {
          await loadBinders();
          if (new URLSearchParams(window.location.search).get("create") === "1") setShowCreate(true);
        }
      })
      .catch(() => setAuthenticated(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  function downloadBackup(format: "json" | "csv") {
    window.location.assign(`/api/collections/backup${format === "csv" ? "?format=csv" : ""}`);
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/collections/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: await file.text() });
      const result = await response.json() as { restoredBinders?: number; restoredEntries?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "Restauration impossible");
      setMessage(`${result.restoredBinders} classeur(s) et ${result.restoredEntries} objet(s) restaurés.`);
      await loadBinders();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Restauration impossible"); }
    finally { setBusy(false); }
  }

  if (authenticated === null) return <CollectionSkeleton />;
  if (!authenticated) return <CollectionLogin googleConfigured={googleConfigured} />;

  const portfolioValue = binders.reduce((sum, binder) => sum + binder.value, 0);
  const itemCount = binders.reduce((sum, binder) => sum + binder.totalItems, 0);
  const completed = binders.filter((binder) => binder.progress === 100).length;
  const sealedCount = binders.filter((binder) => binder.type === "MASTER_ITEMS").reduce((sum, binder) => sum + binder.totalItems, 0);
  const cardCount = Math.max(0, itemCount - sealedCount);
  const historicalValues = binders.flatMap((binder) => binder.history.map((point) => point.value));
  const lowValue = historicalValues.length ? Math.min(...historicalValues) : portfolioValue;
  const highValue = historicalValues.length ? Math.max(...historicalValues, portfolioValue) : portfolioValue;
  const averageValue = historicalValues.length ? historicalValues.reduce((sum, value) => sum + value, 0) / historicalValues.length : portfolioValue;

  return (
    <main className="app-page maquette-page portfolio-page">
      <header className="maquette-topbar relative z-10"><div><span>Vue d&apos;ensemble</span><h1>Portefeuille</h1></div></header>
      {message && <p className="relative z-10 mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100">{message}</p>}

      <section className="summary-row"><div className="summary-card neu-card"><span className="num">{cardCount}</span><span className="lab">Cartes</span></div><div className="summary-card neu-card"><span className="num">{sealedCount}</span><span className="lab">Items</span></div><div className="summary-card neu-card"><span className="num">{completed}</span><span className="lab">Terminés</span></div></section>
      <section className="value-card neu-card"><span className="lab">Valeur totale</span><strong className="amount">{euro(portfolioValue)}</strong><span className="delta">Cotation Cardmarket actuelle</span><div className="value-chart"><svg viewBox="0 0 320 100" preserveAspectRatio="none"><defs><linearGradient id="walletFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5b8def" stopOpacity=".4"/><stop offset="1" stopColor="#5b8def" stopOpacity="0"/></linearGradient></defs><polyline points="0,76 26,69 52,72 78,61 104,64 130,47 156,51 182,36 208,40 234,26 260,30 286,17 320,10" fill="none" stroke="#5b8def" strokeWidth="3" strokeLinecap="round"/><polygon points="0,76 26,69 52,72 78,61 104,64 130,47 156,51 182,36 208,40 234,26 260,30 286,17 320,10 320,100 0,100" fill="url(#walletFill)"/></svg></div><div className="range-stats"><div><span>Bas</span><strong>{euro(lowValue)}</strong></div><div><span>Moyenne</span><strong>{euro(averageValue)}</strong></div><div><span>Haut</span><strong>{euro(highValue)}</strong></div></div></section>
      <section className="action-row"><Link href="/collection/sales" className="action-card neu-card"><span className="ico">↗</span><strong>Ventes</strong><small>Historique et P&amp;L</small></Link><Link href="/items" className="action-card neu-card"><span className="ico">＋</span><strong>Ajouter un produit</strong><small>Carte ou item coté</small></Link></section>
      <section className="binder-section"><div className="section-heading"><h2>Mes classeurs</h2></div>{binders.length?<div className="binder-list">{binders.map((binder)=><Link key={binder.id} href={`/portfolio/${binder.id}`} className="binder-row"><span className="binder-mini-cover">{binder.coverImageUrl?<img src={binder.coverImageUrl} alt=""/>:TYPE_META[binder.type].icon}</span><span className="binder-info"><strong>{binder.name}</strong><small>{TYPE_META[binder.type].label}{binder.progress!==null?` · ${binder.progress}%`:""}</small></span><span className="binder-value"><strong>{euro(binder.value)}</strong><small>{binder.totalItems} élément(s)</small></span></Link>)}</div>:<EmptyCollection onCreate={() => setShowCreate(true)} />}</section>
      <section className="portfolio-utilities"><button onClick={() => downloadBackup("csv")}>↓ CSV</button><button onClick={() => downloadBackup("json")}>↓ Sauvegarder</button><button onClick={() => restoreInput.current?.click()}>↑ Restaurer</button><input ref={restoreInput} type="file" accept="application/json,.json" className="hidden" onChange={restoreBackup} /></section>

      {showCreate && <CreateBinder close={() => setShowCreate(false)} created={async (id, setId) => { setShowCreate(false); setCreatedBinder({ id, setId }); await loadBinders(); }} />}
      {createdBinder && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreatedBinder(null); }}><section className="app-modal text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400/15 text-3xl text-emerald-300">✓</span><p className="eyebrow mt-5">Classeur créé</p><h2 className="mt-2 text-2xl font-bold">Ton nouvel espace est prêt.</h2><p className="mt-2 text-sm text-slate-400">Tu peux commencer à sélectionner les cartes que tu possèdes, ou compléter le classeur plus tard.</p><div className="mt-6 grid gap-3">{createdBinder.setId && <Link href={`/collection/blocks?set=${encodeURIComponent(createdBinder.setId)}`} className="button-primary">Ajouter mes cartes maintenant</Link>}<Link href={`/portfolio/${createdBinder.id}`} className="neu-button">Ouvrir le classeur</Link><button className="text-sm text-slate-500" onClick={() => setCreatedBinder(null)}>Plus tard</button></div></section></div>}
    </main>
  );
}

export function BinderWorkspace({ detail, busy, refresh }: { detail: BinderDetail; busy: boolean; refresh: () => Promise<void> }) {
  const [tab, setTab] = useState<"collection" | "missing" | "portfolio" | "activity">("collection");
  const [query, setQuery] = useState("");
  const [searchKind, setSearchKind] = useState<"CARD" | "ITEM">("CARD");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const ownedIds = useMemo(() => new Set(detail.entries.map((entry) => entry.externalId)), [detail.entries]);
  const isMaster = detail.binder.type === "MASTER_CARDS" || detail.binder.type === "MASTER_ITEMS";
  const visibleTargets = detail.targets.filter((target) => tab !== "missing" || !target.owned);

  useEffect(() => {
    if (isMaster || query.trim().length < 2) { setResults([]); return; }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/collections/search?kind=${searchKind}&q=${encodeURIComponent(query.trim())}`);
      if (response.ok) setResults(await response.json() as SearchResult[]);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, searchKind, isMaster]);

  async function toggle(target: Target | SearchResult, owned: boolean, entryId?: string) {
    setWorkingId(target.id);
    try {
      if (owned) {
        const params = new URLSearchParams(entryId ? { entryId } : { externalId: target.kind === "ITEM" ? `cardmarket:${target.id}` : target.id });
        await fetch(`/api/collections/${detail.binder.id}/entries?${params}`, { method: "DELETE" });
      } else {
        await fetch(`/api/collections/${detail.binder.id}/entries`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(target.kind === "ITEM" || searchKind === "ITEM" ? { kind: "ITEM", productId: target.id } : { kind: "CARD", cardId: target.id }),
        });
      }
      await refresh();
    } finally { setWorkingId(null); }
  }

  const progress = detail.binder.target ? Math.round((detail.entries.length / detail.binder.target) * 100) : null;
  return (
    <section className="binder-workspace relative z-10 mt-8 overflow-hidden rounded-[2.25rem] border border-white/10 bg-slate-950/40 shadow-2xl shadow-black/40 backdrop-blur-2xl">
      <div className="binder-hero relative overflow-hidden p-6 md:p-9" style={{ "--binder-accent": detail.binder.accentColor } as React.CSSProperties}>
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/15 bg-slate-950/50 p-3 shadow-2xl">
              {detail.binder.coverImageUrl ? <img src={detail.binder.coverImageUrl} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-4xl">{TYPE_META[detail.binder.type].icon}</span>}
            </div>
            <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-200">{TYPE_META[detail.binder.type].label}</p><h2 className="mt-1 font-display text-3xl font-bold md:text-4xl">{detail.binder.name}</h2><p className="mt-2 text-sm text-slate-400">{detail.binder.description || detail.binder.setName || TYPE_META[detail.binder.type].kicker}</p></div>
          </div>
          <div className="flex gap-6"><div><span className="text-xs text-slate-500">Valeur</span><strong className="block text-2xl text-emerald-300">{euro(detail.value)}</strong></div>{progress !== null && <div><span className="text-xs text-slate-500">Complétion</span><strong className="block text-2xl">{progress}%</strong></div>}</div>
        </div>
      </div>
      <div className="border-y border-white/5 px-5 py-3">
        <nav className="flex gap-2 overflow-x-auto">
          <Tab active={tab === "collection"} onClick={() => setTab("collection")}>Collection <b>{detail.entries.length}</b></Tab>
          {isMaster && <Tab active={tab === "missing"} onClick={() => setTab("missing")}>À trouver <b>{detail.targets.filter((target) => !target.owned).length}</b></Tab>}
          <Tab active={tab === "portfolio"} onClick={() => setTab("portfolio")}>Portefeuille</Tab>
          <Tab active={tab === "activity"} onClick={() => setTab("activity")}>Activité <b>{detail.activities.length}</b></Tab>
        </nav>
      </div>

      <div className="p-5 md:p-8">
        {tab === "portfolio" ? <PortfolioPanel detail={detail} /> : tab === "activity" ? <ActivityPanel activities={detail.activities} /> : isMaster ? (
          <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
            {visibleTargets.map((target) => { const entry = detail.entries.find((item) => item.externalId === target.id || item.externalId === `cardmarket:${target.id}`); return <CollectibleTile key={target.id} target={target} href={target.kind === "ITEM" ? `/items/${target.id}` : `/cards/${target.id}`} working={workingId === target.id || busy} onToggle={() => toggle(target, target.owned)} onEdit={entry ? () => setEditing(entry) : undefined} />; })}
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-3 md:flex-row">
              <div className="flex rounded-2xl bg-slate-950/60 p-1"><button className={searchKind === "CARD" ? "segment-active" : "segment"} onClick={() => setSearchKind("CARD")}>Cartes</button><button className={searchKind === "ITEM" ? "segment-active" : "segment"} onClick={() => setSearchKind("ITEM")}>Items</button></div>
              <input className="input h-12 flex-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchKind === "CARD" ? "Rechercher Pikachu, Dracaufeu…" : "Rechercher ETB, booster, display…"} />
            </div>
            {results.length > 0 && <div className="mb-10"><p className="eyebrow mb-4">Résultats</p><div className="grid grid-cols-3 gap-3 md:grid-cols-5 xl:grid-cols-7">{results.map((result) => <CollectibleTile key={result.id} href={searchKind === "ITEM" ? `/items/${result.id}` : `/cards/${result.id}`} target={{ ...result, kind: searchKind, owned: ownedIds.has(searchKind === "ITEM" ? `cardmarket:${result.id}` : result.id), number: result.localId }} working={workingId === result.id} onToggle={() => toggle({ ...result, kind: searchKind, owned: false }, ownedIds.has(searchKind === "ITEM" ? `cardmarket:${result.id}` : result.id))} />)}</div></div>}
            <p className="eyebrow mb-4">Dans ce classeur</p>
            {detail.entries.length ? <div className="grid grid-cols-3 gap-3 md:grid-cols-5 xl:grid-cols-7">{detail.entries.map((entry) => <CollectibleTile key={entry.id} href={entry.kind === "ITEM" && entry.productId ? `/items/${entry.productId}` : `/cards/${entry.externalId}`} target={{ ...entry, id: entry.externalId, owned: true, price: entry.unitValue }} working={workingId === entry.externalId} onToggle={() => toggle({ ...entry, id: entry.externalId }, true, entry.id)} onEdit={() => setEditing(entry)} />)}</div> : <div className="rounded-3xl border border-dashed border-slate-700/50 p-14 text-center text-slate-500">Recherche une carte ou un item pour commencer ce classeur.</div>}
          </>
        )}
      </div>
      {editing && <EntryEditor binderId={detail.binder.id} entry={editing} close={() => setEditing(null)} saved={async () => { setEditing(null); await refresh(); }} />}
    </section>
  );
}

function CollectibleTile({ target, href, working, onToggle, onEdit }: { target: Target; href?: string; working: boolean; onToggle: () => void; onEdit?: () => void }) {
  return <article className={`collectible-tile group ${target.owned ? "is-owned" : "is-missing"}`}>
    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-900">
      {href ? <Link href={href} className="block h-full" aria-label={`Voir ${target.name}`}>{target.imageUrl ? <img src={target.imageUrl} alt={target.name} loading="lazy" className="h-full w-full object-contain transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(56,189,248,.2),transparent_55%)] text-4xl">{target.kind === "ITEM" ? "⬡" : "◇"}</div>}</Link> : target.imageUrl ? <img src={target.imageUrl} alt={target.name} loading="lazy" className="h-full w-full object-contain transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(56,189,248,.2),transparent_55%)] text-4xl">{target.kind === "ITEM" ? "⬡" : "◇"}</div>}
      {target.owned && <span className="absolute left-2 top-2 rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-bold text-emerald-950">✓ ACQUIS</span>}
      {onEdit && <button type="button" onClick={onEdit} className="absolute bottom-2 left-2 rounded-full border border-white/15 bg-slate-950/80 px-3 py-2 text-[10px] font-bold text-slate-100 backdrop-blur-xl">GÉRER</button>}
      <button disabled={working} onClick={onToggle} className={`absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full border backdrop-blur-xl ${target.owned ? "border-rose-300/30 bg-rose-950/80 text-rose-200" : "border-cyan-300/30 bg-slate-950/80 text-cyan-200"}`}>{working ? "…" : target.owned ? "−" : "+"}</button>
    </div>
    <div className="px-1 pb-1 pt-3">{href ? <Link href={href}><h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 hover:text-cyan-200">{target.name}</h3></Link> : <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">{target.name}</h3>}<div className="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>{target.number ? `#${target.number}` : formatKind(target.productKind)}</span>{typeof target.price === "number" && target.price > 0 && <strong className="text-emerald-300">{euro(target.price)}</strong>}</div></div>
  </article>;
}

function EntryEditor({ binderId, entry, close, saved }: { binderId: string; entry: Entry; close: () => void; saved: () => Promise<void> }) {
  const [form, setForm] = useState({ quantity: String(entry.quantity), purchasePrice: entry.purchasePrice?.toString() ?? "", manualValue: entry.manualValue?.toString() ?? "", variant: entry.variant, language: entry.language, condition: entry.condition, notes: entry.notes ?? "", grader: entry.grader ?? "", grade: entry.grade ?? "", certification: entry.certification ?? "", page: entry.page?.toString() ?? "", row: entry.row?.toString() ?? "", column: entry.column?.toString() ?? "" });
  const [sale, setSale] = useState({ quantity: "1", unitSalePrice: "", fees: "", soldAt: new Date().toISOString().slice(0, 10) });
  const [showSale, setShowSale] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const field = (name: keyof typeof form) => ({ value: form[name], onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [name]: event.target.value })) });
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); const response = await fetch(`/api/collections/${binderId}/entries`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId: entry.id, ...form }) }); setBusy(false); if (!response.ok) { const data = await response.json() as { error?: string }; setError(data.error || "Enregistrement impossible"); return; } await saved(); }
  async function sell() { setBusy(true); setError(""); const response = await fetch("/api/collection-sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId: entry.id, quantity: Number(sale.quantity), unitSalePrice: Number(sale.unitSalePrice), fees: Number(sale.fees), soldAt: sale.soldAt }) }); setBusy(false); if (!response.ok) { const data = await response.json() as { error?: string }; setError(data.error || "Vente impossible"); return; } await saved(); }
  return <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/80 backdrop-blur-xl md:place-items-center md:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><form onSubmit={submit} className="modal-orbit max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#0b111c] p-6 md:rounded-[2.25rem] md:p-8">
    <div className="flex gap-5"><div className="h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-900">{entry.imageUrl && <img src={entry.imageUrl} alt="" className="h-full w-full object-contain" />}</div><div className="min-w-0 flex-1"><p className="eyebrow">Fiche de collection</p><h3 className="mt-2 truncate font-display text-2xl font-bold">{entry.name}</h3><p className="mt-2 text-sm text-slate-500">Cotation actuelle · {euro(entry.unitValue)}</p></div><button type="button" onClick={close} className="h-10 w-10 rounded-full bg-slate-800">×</button></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><FormField label="Quantité"><input type="number" min="1" className="input h-11 w-full" {...field("quantity")} /></FormField><FormField label="Prix d’achat / unité"><input type="number" min="0" step="0.01" className="input h-11 w-full" {...field("purchasePrice")} /></FormField><FormField label="Valeur manuelle"><input type="number" min="0" step="0.01" className="input h-11 w-full" placeholder="Oracle sinon" {...field("manualValue")} /></FormField><FormField label="Variante"><select className="input h-11 w-full" {...field("variant")}><option value="normal">Normale</option><option value="reverse">Reverse</option><option value="holo">Holo</option><option value="first-edition">1re édition</option><option value="sealed">Scellé</option></select></FormField><FormField label="Langue"><select className="input h-11 w-full" {...field("language")}><option value="fr">Français</option><option value="en">Anglais</option><option value="jp">Japonais</option><option value="de">Allemand</option><option value="it">Italien</option></select></FormField><FormField label="État"><select className="input h-11 w-full" {...field("condition")}><option>NM</option><option>EX</option><option>GD</option><option>LP</option><option>PL</option><option>PO</option></select></FormField></div>
    <p className="eyebrow mt-7">Gradation</p><div className="mt-3 grid gap-4 sm:grid-cols-3"><FormField label="Organisme"><input className="input h-11 w-full" placeholder="PSA, PCA, BGS…" {...field("grader")} /></FormField><FormField label="Note"><input className="input h-11 w-full" placeholder="10, 9.5…" {...field("grade")} /></FormField><FormField label="Certification"><input className="input h-11 w-full" {...field("certification")} /></FormField></div>
    <p className="eyebrow mt-7">Emplacement physique</p><div className="mt-3 grid grid-cols-3 gap-4"><FormField label="Page"><input type="number" min="1" className="input h-11 w-full" {...field("page")} /></FormField><FormField label="Ligne"><input type="number" min="1" className="input h-11 w-full" {...field("row")} /></FormField><FormField label="Colonne"><input type="number" min="1" className="input h-11 w-full" {...field("column")} /></FormField></div>
    <FormField label="Notes"><textarea className="input mt-3 min-h-24 w-full py-3" {...field("notes")} /></FormField>
    <button type="button" className="neu-button mt-6 w-full text-emerald-200" onClick={() => setShowSale((value) => !value)}>↗ Enregistrer une vente</button>
    {showSale&&<section className="mt-4 rounded-3xl border border-emerald-300/15 bg-emerald-300/5 p-4"><p className="eyebrow">Sortie du portefeuille</p><div className="mt-3 grid gap-3 sm:grid-cols-4"><FormField label="Quantité vendue"><input className="input h-11 w-full" type="number" min="1" max={entry.quantity} value={sale.quantity} onChange={(event)=>setSale((current)=>({...current,quantity:event.target.value}))}/></FormField><FormField label="Prix de vente / unité"><input className="input h-11 w-full" type="number" min="0" step="0.01" value={sale.unitSalePrice} onChange={(event)=>setSale((current)=>({...current,unitSalePrice:event.target.value}))}/></FormField><FormField label="Frais totaux"><input className="input h-11 w-full" type="number" min="0" step="0.01" value={sale.fees} onChange={(event)=>setSale((current)=>({...current,fees:event.target.value}))}/></FormField><FormField label="Date"><input className="input h-11 w-full" type="date" value={sale.soldAt} onChange={(event)=>setSale((current)=>({...current,soldAt:event.target.value}))}/></FormField></div><button type="button" disabled={busy||!sale.unitSalePrice||entry.quantity<1} className="button-primary mt-4 h-11 w-full" onClick={()=>void sell()}>Confirmer la vente</button></section>}
    {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}<button disabled={busy} className="button-primary mt-6 h-12 w-full">{busy ? "Enregistrement…" : "Enregistrer la fiche"}</button>
  </form></div>;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block text-xs text-slate-500">{label}</span>{children}</label>; }

function ActivityPanel({ activities }: { activities: Activity[] }) {
  const labels: Record<string, string> = { BINDER_CREATED: "Classeur créé", ENTRY_ADDED: "Ajouté à la collection", ENTRY_UPDATED: "Fiche mise à jour", ENTRY_REMOVED: "Retiré de la collection", BACKUP_RESTORED: "Sauvegarde restaurée" };
  return <div className="mx-auto max-w-3xl"><div className="mb-6"><p className="eyebrow">Journal sécurisé</p><h3 className="mt-2 font-display text-2xl font-bold">Histoire du classeur</h3></div>{activities.length ? <div className="space-y-3">{activities.map((activity) => <article key={activity.id} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-950/50 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-400/10 text-cyan-200">✦</span><div className="min-w-0 flex-1"><strong className="block text-sm">{labels[activity.action] || activity.action}</strong><span className="block truncate text-sm text-slate-500">{activity.entryName || "Collection"}</span></div><time className="text-right text-xs text-slate-600">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(activity.createdAt))}</time></article>)}</div> : <div className="rounded-3xl border border-dashed border-slate-700/50 p-12 text-center text-slate-500">Les prochains mouvements apparaîtront ici.</div>}</div>;
}

function CreateBinder({ close, created }: { close: () => void; created: (id: string, setId: string | null) => Promise<void> }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<BinderType | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<BlockOption[]>([]);
  const [blockId, setBlockId] = useState("");
  const [sets, setSets] = useState<SetOption[]>([]);
  const [setId, setSetId] = useState("");
  const [busy, setBusy] = useState(false);
  const needsSet = type === "MASTER_CARDS" || type === "MASTER_ITEMS";
  useEffect(() => {
    if (!needsSet) return;
    fetch("/api/collections/blocks").then((response) => response.json()).then((data) => setBlocks(data.series ?? [])).catch(() => setBlocks([]));
  }, [needsSet]);
  async function chooseBlock(id: string) {
    setBlockId(id); setSetId(""); setBusy(true);
    const response = await fetch(`/api/collections/blocks?series=${encodeURIComponent(id)}`);
    const data = await response.json(); setSets(data.sets ?? []); setBusy(false); setStep(3);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    if (!type) return;
    const response = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, name, description, setId }) });
    setBusy(false); if (!response.ok) return;
    const binder = await response.json() as { id: string }; await created(binder.id, needsSet ? setId : null);
  }
  const titles = ["", "Que veux-tu collectionner ?", "Choisis ton bloc Pokémon", "Choisis ta série", "Personnalise ton classeur"];
  const displayedStep = needsSet ? step : step === 1 ? 1 : 2;
  function back() { if (step === 4 && needsSet) setStep(3); else if (step === 3) setStep(2); else setStep(1); }
  return <div className="binder-wizard-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <form onSubmit={submit} className="binder-wizard modal-orbit">
      <header className="binder-wizard-header"><button type="button" className="circle-action" onClick={step === 1 ? close : back}>{step === 1 ? "×" : "←"}</button><div><p className="eyebrow">Nouvel univers · étape {displayedStep}/{needsSet ? 4 : 2}</p><h2>{titles[step]}</h2></div><button type="button" className="circle-action" onClick={close}>×</button></header>
      <div className="binder-wizard-body">
        {step === 1 && <div className="binder-type-screen">{(["GLOBAL", "MASTER_CARDS", "MASTER_ITEMS"] as BinderType[]).map((key) => <button type="button" key={key} onClick={() => { setType(key); setBlockId(""); setSetId(""); setSets([]); setStep(key === "GLOBAL" ? 4 : 2); }} className="type-choice"><span className="text-2xl">{TYPE_META[key].icon}</span><strong>{TYPE_META[key].label}</strong><small>{TYPE_META[key].kicker}</small></button>)}</div>}
        {step === 2 && <div className="binder-choice-grid">{blocks.map((block) => <button type="button" key={block.id} onClick={() => void chooseBlock(block.id)} className={`binder-catalog-choice ${blockId === block.id ? "active" : ""}`}><span className="binder-choice-image">{block.logo ? <img src={block.logo} alt="" /> : <img src="/icon.svg" alt="PokéDeal" />}</span><strong>{block.name}</strong><small>{block.setCount} série(s) · {block.releaseDate ? new Date(block.releaseDate).getFullYear() : "—"}</small></button>)}</div>}
        {step === 3 && <div className="binder-choice-grid">{sets.map((set) => <button type="button" key={set.id} onClick={() => { setSetId(set.id); setStep(4); }} className={`binder-catalog-choice ${setId === set.id ? "active" : ""}`}><span className="binder-choice-image">{set.logo ? <img src={set.logo} alt="" /> : <img src="/icon.svg" alt="PokéDeal" />}</span><strong>{set.name}</strong><small>{set.total} cartes · {set.releaseDate ? new Date(set.releaseDate).getFullYear() : "—"}</small></button>)}</div>}
        {step === 4 && <div className="binder-details-screen"><div className="pokeball-mark"><span /></div><p>{type ? TYPE_META[type].label : "Nouveau classeur"}</p><label><span>Nom personnalisé</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Mon master set 151" /></label><label><span>Description</span><textarea className="input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mon objectif, mon histoire…" /></label></div>}
      </div>
      {step === 4 && <footer className="binder-wizard-footer"><button type="button" className="neu-button" onClick={back}>Retour</button><button disabled={busy || !type || (needsSet && !setId)} className="button-primary">{busy ? "Création…" : "Créer mon espace"}</button></footer>}
    </form>
  </div>;
}

function PortfolioPanel({ detail }: { detail: BinderDetail }) {
  const max = Math.max(...detail.history.map((point) => point.value), detail.value, 1);
  const invested = detail.entries.reduce((sum, entry) => sum + (entry.purchasePrice ?? 0) * entry.quantity, 0);
  const gain = invested ? detail.value - invested : null;
  return <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
    <div className="rounded-3xl border border-white/5 bg-slate-950/50 p-6"><div className="flex items-end justify-between"><div><p className="eyebrow">Valeur vivante</p><strong className="mt-2 block text-4xl text-emerald-300">{euro(detail.value)}</strong></div><span className="text-xs text-slate-500">Cardmarket · EUR</span></div><div className="mt-10 flex h-48 items-end gap-2">{(detail.history.length ? detail.history : [{ value: detail.value, recordedAt: new Date().toISOString() }]).map((point, index) => <div key={`${point.recordedAt}-${index}`} className="group relative flex-1 rounded-t-lg bg-gradient-to-t from-cyan-500/30 to-emerald-300/80" style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }}><span className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-xs group-hover:block">{euro(point.value)}</span></div>)}</div></div>
    <div className="grid gap-4"><HeroMetric label="Prix d’achat saisi" value={euro(invested)} detail="Coût de revient" tone="cyan" /><HeroMetric label="Plus-value latente" value={gain === null ? "À renseigner" : euro(gain)} detail={gain === null ? "Ajoute tes prix d’achat" : `${gain >= 0 ? "+" : ""}${((gain / invested) * 100).toFixed(1)} %`} tone={gain !== null && gain < 0 ? "violet" : "emerald"} /></div>
  </div>;
}

function HeroMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "emerald" | "cyan" | "violet" }) { return <div className={`hero-metric tone-${tone}`}><span className="text-xs text-slate-500">{label}</span><strong className="mt-2 block font-display text-2xl tracking-tight md:text-3xl">{value}</strong><small className="mt-2 block text-slate-500">{detail}</small></div>; }
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button className={`workspace-tab ${active ? "active" : ""}`} onClick={onClick}>{children}</button>; }
function EmptyCollection({ onCreate }: { onCreate: () => void }) { return <button onClick={onCreate} className="surface group w-full overflow-hidden p-12 text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-cyan-300/20 bg-cyan-400/5 text-4xl text-cyan-300 transition group-hover:scale-110">＋</span><h3 className="mt-5 font-display text-2xl font-bold">Crée ton premier univers</h3><p className="mt-2 text-slate-500">Master set complet, objets scellés ou classeur totalement libre.</p></button>; }
function CollectionSkeleton() { return <main className="collection-stage min-h-screen p-10"><div className="h-8 w-40 animate-pulse rounded-full bg-slate-800" /><div className="mt-6 h-20 max-w-3xl animate-pulse rounded-3xl bg-slate-800/70" /></main>; }
function CollectionLogin({ googleConfigured }: { googleConfigured: boolean }) { return <main className="collection-stage grid min-h-[80vh] place-items-center p-5"><div className="modal-orbit w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 text-center backdrop-blur-2xl"><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-cyan-300/10 text-3xl">✦</span><p className="eyebrow mt-6">Espace privé</p><h1 className="mt-2 font-display text-3xl font-bold">Ta collection t’attend.</h1><p className="mt-3 text-sm text-slate-500">Connecte-toi avec Google : ton compte est créé automatiquement et tes données restent synchronisées sur tous tes appareils.</p><button disabled={!googleConfigured} className="button-primary mt-7 flex h-12 w-full items-center justify-center gap-3" onClick={() => signIn("google", { callbackUrl: "/onboarding" })}><span className="grid h-7 w-7 place-items-center rounded-full bg-white text-blue-600">G</span>{googleConfigured ? "Continuer avec Google" : "Google à configurer"}</button></div></main>; }
function euro(value: number) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value); }
function formatKind(value?: string) { return value ? value.toLowerCase().replaceAll("_", " ") : ""; }
