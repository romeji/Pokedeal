"use client";

import { signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

type State = { authenticated: boolean; googleAuthConfigured?: boolean; user?: { name?: string | null; image?: string | null; provider?: string } | null };

export function AccountControl({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State | null>(null);
  useEffect(() => { fetch("/api/admin/session").then((response) => response.json()).then(setState).catch(() => setState({ authenticated: false })); }, []);
  if (!state) return <span className="h-9 w-9 animate-pulse rounded-full bg-slate-800" />;
  if (!state.authenticated) return <button className="account-pill" disabled={!state.googleAuthConfigured} title={state.googleAuthConfigured ? "Se connecter avec Google" : "Connexion Google à configurer"} onClick={() => signIn("google", { callbackUrl: window.location.pathname })}><span className="account-avatar">G</span>{!compact && <span>{state.googleAuthConfigured ? "Connexion" : "Google à configurer"}</span>}</button>;
  const logout = async () => {
    if (state.user?.provider === "google") await signOut({ callbackUrl: "/" });
    else { await fetch("/api/admin/session", { method: "DELETE" }); window.location.reload(); }
  };
  return <button className="account-pill" onClick={logout} title="Se déconnecter">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {state.user?.image ? <img src={state.user.image} alt="" className="account-avatar object-cover" referrerPolicy="no-referrer" /> : <span className="account-avatar">✓</span>}
    {!compact && <span className="max-w-28 truncate">{state.user?.name || "Mon compte"}</span>}
  </button>;
}
