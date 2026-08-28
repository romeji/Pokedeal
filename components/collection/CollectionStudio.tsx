"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";

type BinderType = "GLOBAL" | "CUSTOM" | "MASTER_CARDS" | "MASTER_ITEMS";
type Binder = {
  id: string; name: string; description: string | null; type: BinderType; setName: string | null;
  coverImageUrl: string | null; accentColor: string; owned: number; totalItems: number;
  target: number | null; progress: number | null; value: number; updatedAt: string;
  history: Array<{ value: number; recordedAt: string }>;
};
type SetOption = { id: string; name: string; logo?: string; cardCount: { total: number; official: number } };
type Target = {
  id: string; name: string; number?: string; imageUrl?: string | null; owned: boolean;
  kind: "CARD" | "ITEM"; productKind?: string; price?: number;
};
type Entry = Target & {
  externalId: string; variant: string; condition: string; quantity: number;
  purchasePrice: number | null; manualValue: number | null; unitValue: number; updatedAt: string;
  language: string; notes: string | null; grader: string | null; grade: string | null;
  certification: string | null; page: number | null; row: number | null; column: number | null;
};
type Activity = { id: string; action: string; entryName: string | null; details: unknown; createdAt: string };
type BinderDetail = {
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BinderDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const restoreInput = useRef<HTMLInputElement>(null);

  async function loadBinders(preferredId?: string) {
    const response = await fetch("/api/collections", { cache: "no-store" });
    if (response.status === 401) { setAuthenticated(false); return; }
    if (!response.ok) throw new Error("Portefeuille indisponible");
    const data = (await response.json()) as Binder[];
    setBinders(data);
    const id = preferredId ?? selectedId ?? data[0]?.id;
    if (id) { setSelectedId(id); await loadDetail(id); }
  }

  async function loadDetail(id: string) {
    const response = await fetch(`/api/collections/${id}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Classeur indisponible");
    setDetail((await response.json()) as BinderDetail);
  }

  useEffect(() => {
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then(async (data: { authenticated?: boolean; googleAuthConfigured?: boolean }) => {
        setGoogleConfigured(Boolean(data.googleAuthConfigured));
        const valid = Boolean(data.authenticated);
        setAuthenticated(valid);
        if (valid) await loadBinders();
      })
      .catch(() => setAuthenticated(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function chooseBinder(id: string) {
    setSelectedId(id); setBusy(true);
    try { await loadDetail(id); } finally { setBusy(false); }
  }

  async function refresh() {
    if (!selectedId) return;
    await Promise.all([loadBinders(selectedId), loadDetail(selectedId)]);
  }

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

  return (
    <main className="collection-stage min-h-screen overflow-hidden px-4 pb-16 pt-6 md:px-8 lg:px-12">
      <header className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-3"><span className="live-orb" /><p className="eyebrow">Collection intelligence</p></div>
          <h1 className="mt-3 max-w-4xl font-display text-4xl font-bold tracking-[-.05em] sm:text-6xl xl:text-7xl">
            Ton musée Pokémon,<br /><span className="aurora-text">vivant et valorisé.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
            Classeurs libres, master sets cartes ou objets scellés. Chaque acquisition fait évoluer ton portefeuille avec la cotation Cardmarket.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="button-secondary h-12 px-4" onClick={() => downloadBackup("csv")}>↓ CSV</button>
          <button className="button-secondary h-12 px-4" onClick={() => downloadBackup("json")}>↓ Sauvegarde</button>
          <button className="button-secondary h-12 px-4" onClick={() => restoreInput.current?.click()}>↑ Restaurer</button>
          <input ref={restoreInput} type="file" accept="application/json,.json" className="hidden" onChange={restoreBackup} />
          <button className="button-primary halo-button h-12 px-6" onClick={() => setShowCreate(true)}>＋ Créer un classeur</button>
        </div>
      </header>
      {message && <p className="relative z-10 mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100">{message}</p>}

      <section className="relative z-10 mt-8 grid gap-3 sm:grid-cols-3">
        <HeroMetric label="Valeur du portefeuille" value={euro(portfolioValue)} detail="Cotation actuelle" tone="emerald" />
        <HeroMetric label="Objets collectionnés" value={itemCount.toLocaleString("fr-FR")} detail={`${binders.length} classeur${binders.length > 1 ? "s" : ""}`} tone="cyan" />
        <HeroMetric label="Master sets terminés" value={`${completed}`} detail="Progression synchronisée" tone="violet" />
      </section>

      <section className="relative z-10 mt-10">
        <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Tes univers</p><h2 className="mt-1 font-display text-2xl font-semibold">Continuer la collection</h2></div><span className="text-xs text-slate-500">Glisse pour explorer →</span></div>
        {binders.length ? (
          <div className="no-scrollbar flex snap-x gap-5 overflow-x-auto pb-5">
            {binders.map((binder) => <BinderCover key={binder.id} binder={binder} active={binder.id === selectedId} onClick={() => chooseBinder(binder.id)} />)}
            <button onClick={() => setShowCreate(true)} className="min-h-64 min-w-48 snap-start rounded-[2rem] border border-dashed border-slate-600/50 bg-slate-900/20 text-slate-500 transition hover:border-cyan-400/50 hover:text-cyan-200">＋<span className="mt-2 block text-sm">Nouvel univers</span></button>
          </div>
        ) : <EmptyCollection onCreate={() => setShowCreate(true)} />}
      </section>

      {detail && <BinderWorkspace detail={detail} busy={busy} refresh={refresh} />}
      {showCreate && <CreateBinder close={() => setShowCreate(false)} created={async (id) => { setShowCreate(false); await loadBinders(id); }} />}
    </main>
  );
}

function BinderWorkspace({ detail, busy, refresh }: { detail: BinderDetail; busy: boolean; refresh: () => Promise<void> }) {
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
    <section className="relative z-10 mt-8 overflow-hidden rounded-[2.25rem] border border-white/10 bg-slate-950/40 shadow-2xl shadow-black/40 backdrop-blur-2xl">
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
            {visibleTargets.map((target) => { const entry = detail.entries.find((item) => item.externalId === target.id || item.externalId === `cardmarket:${target.id}`); return <CollectibleTile key={target.id} target={target} working={workingId === target.id || busy} onToggle={() => toggle(target, target.owned)} onEdit={entry ? () => setEditing(entry) : undefined} />; })}
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-3 md:flex-row">
              <div className="flex rounded-2xl bg-slate-950/60 p-1"><button className={searchKind === "CARD" ? "segment-active" : "segment"} onClick={() => setSearchKind("CARD")}>Cartes</button><button className={searchKind === "ITEM" ? "segment-active" : "segment"} onClick={() => setSearchKind("ITEM")}>Items</button></div>
              <input className="input h-12 flex-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchKind === "CARD" ? "Rechercher Pikachu, Dracaufeu…" : "Rechercher ETB, booster, display…"} />
            </div>
            {results.length > 0 && <div className="mb-10"><p className="eyebrow mb-4">Résultats</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-7">{results.map((result) => <CollectibleTile key={result.id} target={{ ...result, kind: searchKind, owned: ownedIds.has(searchKind === "ITEM" ? `cardmarket:${result.id}` : result.id), number: result.localId }} working={workingId === result.id} onToggle={() => toggle({ ...result, kind: searchKind, owned: false }, ownedIds.has(searchKind === "ITEM" ? `cardmarket:${result.id}` : result.id))} />)}</div></div>}
            <p className="eyebrow mb-4">Dans ce classeur</p>
            {detail.entries.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-7">{detail.entries.map((entry) => <CollectibleTile key={entry.id} target={{ ...entry, id: entry.externalId, owned: true, price: entry.unitValue }} working={workingId === entry.externalId} onToggle={() => toggle({ ...entry, id: entry.externalId }, true, entry.id)} onEdit={() => setEditing(entry)} />)}</div> : <div className="rounded-3xl border border-dashed border-slate-700/50 p-14 text-center text-slate-500">Recherche une carte ou un item pour commencer ce classeur.</div>}
          </>
        )}
      </div>
      {editing && <EntryEditor binderId={detail.binder.id} entry={editing} close={() => setEditing(null)} saved={async () => { setEditing(null); await refresh(); }} />}
    </section>
  );
}

function CollectibleTile({ target, working, onToggle, onEdit }: { target: Target; working: boolean; onToggle: () => void; onEdit?: () => void }) {
  return <article className={`collectible-tile group ${target.owned ? "is-owned" : "is-missing"}`}>
    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-900">
      {target.imageUrl ? <img src={target.imageUrl} alt={target.name} loading="lazy" className="h-full w-full object-contain transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(56,189,248,.2),transparent_55%)] text-4xl">{target.kind === "ITEM" ? "⬡" : "◇"}</div>}
      {target.owned && <span className="absolute left-2 top-2 rounded-full bg-emerald-400 px-2 py-1 text-[10px] font-bold text-emerald-950">✓ ACQUIS</span>}
      {onEdit && <button type="button" onClick={onEdit} className="absolute bottom-2 left-2 rounded-full border border-white/15 bg-slate-950/80 px-3 py-2 text-[10px] font-bold text-slate-100 backdrop-blur-xl">GÉRER</button>}
      <button disabled={working} onClick={onToggle} className={`absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full border backdrop-blur-xl ${target.owned ? "border-rose-300/30 bg-rose-950/80 text-rose-200" : "border-cyan-300/30 bg-slate-950/80 text-cyan-200"}`}>{working ? "…" : target.owned ? "−" : "+"}</button>
    </div>
    <div className="px-1 pb-1 pt-3"><h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">{target.name}</h3><div className="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>{target.number ? `#${target.number}` : formatKind(target.productKind)}</span>{typeof target.price === "number" && target.price > 0 && <strong className="text-emerald-300">{euro(target.price)}</strong>}</div></div>
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

function CreateBinder({ close, created }: { close: () => void; created: (id: string) => Promise<void> }) {
  const [type, setType] = useState<BinderType>("MASTER_CARDS");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [setQuery, setSetQuery] = useState("");
  const [sets, setSets] = useState<SetOption[]>([]);
  const [setId, setSetId] = useState("");
  const [busy, setBusy] = useState(false);
  const needsSet = type === "MASTER_CARDS" || type === "MASTER_ITEMS";
  useEffect(() => {
    if (!needsSet) return;
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/collections/sets?q=${encodeURIComponent(setQuery)}`);
      if (response.ok) setSets(await response.json() as SetOption[]);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [setQuery, needsSet]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    const response = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, name, description, setId }) });
    setBusy(false); if (!response.ok) return;
    const binder = await response.json() as { id: string }; await created(binder.id);
  }
  return <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/80 p-0 backdrop-blur-xl md:place-items-center md:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <form onSubmit={submit} className="modal-orbit max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#0b111c] p-6 shadow-2xl md:rounded-[2.25rem] md:p-9">
      <div className="flex justify-between"><div><p className="eyebrow">Nouvel univers</p><h2 className="mt-2 font-display text-3xl font-bold">Que veux-tu collectionner ?</h2></div><button type="button" className="h-10 w-10 rounded-full bg-slate-800 text-slate-400" onClick={close}>×</button></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(Object.keys(TYPE_META) as BinderType[]).map((key) => <button type="button" key={key} onClick={() => { setType(key); setSetId(""); }} className={`type-choice ${type === key ? "active" : ""}`}><span className="text-2xl">{TYPE_META[key].icon}</span><strong className="mt-3 block">{TYPE_META[key].label}</strong><small className="mt-1 block text-slate-500">{TYPE_META[key].kicker}</small></button>)}</div>
      {needsSet && <div className="mt-7"><label className="eyebrow">Choisir la série</label><input className="input mt-3 h-12 w-full" value={setQuery} onChange={(event) => setSetQuery(event.target.value)} placeholder="151, Évolutions Prismatiques, Base Set…" /><div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-2">{sets.map((set) => <button type="button" key={set.id} onClick={() => setSetId(set.id)} className={`set-chip ${setId === set.id ? "active" : ""}`}>{set.logo ? <img src={set.logo} alt="" className="h-9 w-16 object-contain" /> : <span>◇</span>}<span><b className="block max-w-40 truncate text-left text-sm">{set.name}</b><small className="text-slate-500">{set.cardCount.total} cartes</small></span></button>)}</div></div>}
      <div className="mt-7 grid gap-4 md:grid-cols-2"><label><span className="eyebrow">Nom personnalisé</span><input className="input mt-3 h-12 w-full" value={name} onChange={(event) => setName(event.target.value)} placeholder="Optionnel" /></label><label><span className="eyebrow">Description</span><input className="input mt-3 h-12 w-full" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mon objectif, mon histoire…" /></label></div>
      <button disabled={busy || (needsSet && !setId)} className="button-primary mt-8 h-12 w-full">{busy ? "Création…" : "Créer mon espace de collection"}</button>
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

function BinderCover({ binder, active, onClick }: { binder: Binder; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`binder-cover group relative min-h-72 min-w-56 snap-start overflow-hidden text-left ${active ? "active" : ""}`} style={{ "--binder-accent": binder.accentColor } as React.CSSProperties}><div className="absolute inset-0 binder-glow" /><div className="relative flex h-full flex-col p-5"><div className="flex items-start justify-between"><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/70">{TYPE_META[binder.type].label}</span>{binder.progress !== null && <span className="progress-orb" style={{ "--progress": `${binder.progress * 3.6}deg` } as React.CSSProperties}><b>{binder.progress}%</b></span>}</div><div className="flex flex-1 items-center justify-center py-5">{binder.coverImageUrl ? <img src={binder.coverImageUrl} alt="" className="max-h-24 max-w-40 object-contain drop-shadow-2xl transition duration-500 group-hover:scale-110" /> : <span className="text-6xl opacity-70">{TYPE_META[binder.type].icon}</span>}</div><p className="text-xs text-white/50">{binder.setName || TYPE_META[binder.type].kicker}</p><h3 className="mt-1 line-clamp-2 font-display text-xl font-bold">{binder.name}</h3><div className="mt-4 flex items-end justify-between"><span className="text-xs text-white/50">{binder.owned}{binder.target ? ` / ${binder.target}` : " pièces"}</span><strong className="text-emerald-200">{euro(binder.value)}</strong></div></div></button>;
}

function HeroMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "emerald" | "cyan" | "violet" }) { return <div className={`hero-metric tone-${tone}`}><span className="text-xs text-slate-500">{label}</span><strong className="mt-2 block font-display text-2xl tracking-tight md:text-3xl">{value}</strong><small className="mt-2 block text-slate-500">{detail}</small></div>; }
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button className={`workspace-tab ${active ? "active" : ""}`} onClick={onClick}>{children}</button>; }
function EmptyCollection({ onCreate }: { onCreate: () => void }) { return <button onClick={onCreate} className="surface group w-full overflow-hidden p-12 text-center"><span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-cyan-300/20 bg-cyan-400/5 text-4xl text-cyan-300 transition group-hover:scale-110">＋</span><h3 className="mt-5 font-display text-2xl font-bold">Crée ton premier univers</h3><p className="mt-2 text-slate-500">Master set complet, objets scellés ou classeur totalement libre.</p></button>; }
function CollectionSkeleton() { return <main className="collection-stage min-h-screen p-10"><div className="h-8 w-40 animate-pulse rounded-full bg-slate-800" /><div className="mt-6 h-20 max-w-3xl animate-pulse rounded-3xl bg-slate-800/70" /></main>; }
function CollectionLogin({ googleConfigured }: { googleConfigured: boolean }) { return <main className="collection-stage grid min-h-[80vh] place-items-center p-5"><div className="modal-orbit w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 text-center backdrop-blur-2xl"><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-cyan-300/10 text-3xl">✦</span><p className="eyebrow mt-6">Espace privé</p><h1 className="mt-2 font-display text-3xl font-bold">Ta collection t’attend.</h1><p className="mt-3 text-sm text-slate-500">Connecte-toi avec Google : ton compte est créé automatiquement et tes données restent synchronisées sur tous tes appareils.</p><button disabled={!googleConfigured} className="button-primary mt-7 flex h-12 w-full items-center justify-center gap-3" onClick={() => signIn("google", { callbackUrl: "/collection" })}><span className="grid h-7 w-7 place-items-center rounded-full bg-white text-blue-600">G</span>{googleConfigured ? "Continuer avec Google" : "Google à configurer"}</button></div></main>; }
function euro(value: number) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value); }
function formatKind(value?: string) { return value ? value.toLowerCase().replaceAll("_", " ") : ""; }
