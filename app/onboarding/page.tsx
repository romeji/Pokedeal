"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const languages = [{ id: "fr", label: "Français", flag: "🇫🇷" }, { id: "en", label: "English", flag: "🇬🇧" }, { id: "de", label: "Deutsch", flag: "🇩🇪" }, { id: "es", label: "Español", flag: "🇪🇸" }, { id: "it", label: "Italiano", flag: "🇮🇹" }];
const currencies = [{ id: "EUR", label: "Euro", symbol: "€" }, { id: "USD", label: "Dollar US", symbol: "$" }, { id: "GBP", label: "Livre sterling", symbol: "£" }, { id: "CHF", label: "Franc suisse", symbol: "CHF" }];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ locale: "fr", currency: "EUR", trainerName: "", favoritePokemon: "Pikachu", birthDate: "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { fetch("/api/profile/onboarding").then(async (response) => { if (response.status === 401) router.replace("/login"); else { const data = await response.json(); if (data.onboardingCompletedAt) router.replace("/dashboard"); } }).catch(() => setError("Profil momentanément indisponible")); }, [router]);
  async function finish() {
    setBusy(true); setError("");
    const response = await fetch("/api/profile/onboarding", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) setError(data.error || "Enregistrement impossible"); else router.push("/dashboard");
  }
  return <main className="trainer-onboarding"><section className="onboarding-card neu-card"><div className="pokeball-mark"><span /></div><p className="eyebrow">Bienvenue, Dresseur</p><div className="onboarding-progress"><span className={step >= 1 ? "active" : ""} /><span className={step >= 2 ? "active" : ""} /><span className={step >= 3 ? "active" : ""} /></div>
    {step === 1 && <div><h1>Choisis ta langue</h1><p>Elle sera utilisée pour le catalogue et ton espace personnel.</p><div className="onboarding-options">{languages.map((item) => <button key={item.id} className={form.locale === item.id ? "active" : ""} onClick={() => setForm((value) => ({ ...value, locale: item.id }))}><span>{item.flag}</span><strong>{item.label}</strong></button>)}</div><button className="button-primary w-full" onClick={() => setStep(2)}>Continuer</button></div>}
    {step === 2 && <div><h1>Choisis ta devise</h1><p>Les valeurs du portefeuille seront présentées dans cette devise.</p><div className="onboarding-options">{currencies.map((item) => <button key={item.id} className={form.currency === item.id ? "active" : ""} onClick={() => setForm((value) => ({ ...value, currency: item.id }))}><span>{item.symbol}</span><strong>{item.label}</strong></button>)}</div><div className="onboarding-buttons"><button className="neu-button" onClick={() => setStep(1)}>Retour</button><button className="button-primary" onClick={() => setStep(3)}>Continuer</button></div></div>}
    {step === 3 && <div><h1>Ta carte de Dresseur</h1><p>Personnalise ton aventure PokéDeal.</p><div className="trainer-fields"><label>Pseudo<input className="neu-input" value={form.trainerName} onChange={(event) => setForm((value) => ({ ...value, trainerName: event.target.value }))} placeholder="Axellito" /></label><label>Pokémon préféré<input className="neu-input" value={form.favoritePokemon} onChange={(event) => setForm((value) => ({ ...value, favoritePokemon: event.target.value }))} placeholder="Pikachu" /></label><label>Date de naissance<input className="neu-input" type="date" value={form.birthDate} onChange={(event) => setForm((value) => ({ ...value, birthDate: event.target.value }))} /></label></div>{error && <p className="status-message">{error}</p>}<div className="onboarding-buttons"><button className="neu-button" onClick={() => setStep(2)}>Retour</button><button disabled={busy || !form.trainerName.trim() || !form.favoritePokemon.trim() || !form.birthDate} className="button-primary" onClick={() => void finish()}>{busy ? "Création…" : "Commencer l’aventure"}</button></div></div>}
  </section></main>;
}
