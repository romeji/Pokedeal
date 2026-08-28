"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [googleConfigured, setGoogleConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then((state) => setGoogleConfigured(Boolean(state.googleAuthConfigured)))
      .catch(() => setGoogleConfigured(false));
  }, []);
  return <main className="collection-stage grid min-h-[calc(100vh-2rem)] place-items-center p-5">
    <section className="modal-orbit w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-950/75 p-8 text-center backdrop-blur-2xl">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-cyan-300/10 text-3xl">✦</span>
      <p className="eyebrow mt-6">Compte PokéDeal</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Ta collection, partout avec toi.</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">Connecte-toi pour garder tes favoris, tes classeurs et la valeur de ton portefeuille synchronisés entre la PWA et le web.</p>
      <button disabled={!googleConfigured} className="button-primary mt-7 flex h-12 w-full items-center justify-center gap-3 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => signIn("google", { callbackUrl: "/collection" })}>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white font-bold text-blue-600">G</span> {googleConfigured === false ? "Google à configurer" : "Continuer avec Google"}
      </button>
      {googleConfigured === false && <p className="mt-3 text-xs text-amber-300">La connexion sera disponible dès que les trois variables Google seront ajoutées sur Vercel.</p>}
      <p className="mt-5 text-xs text-slate-600">PokéDeal demande uniquement ton identité de base. Aucun accès à Gmail ou Google Drive.</p>
      <div className="mt-6 flex justify-center gap-4 text-xs text-slate-500"><Link href="/privacy">Confidentialité</Link><Link href="/terms">Conditions</Link></div>
    </section>
  </main>;
}
