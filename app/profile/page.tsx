import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { AccountControl } from "@/components/navigation/AccountControl";
import { requireUserPage } from "@/lib/auth/page-user";
import { prisma } from "@/lib/database/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUserPage();
  const [favorites, binders, sales] = await Promise.all([
    prisma.watchlist.count({ where: { userId: user.id } }),
    prisma.collectorBinder.count({ where: { userId: user.id } }),
    prisma.collectionSale.count({ where: { userId: user.id } }),
  ]);
  const isAdmin = user.role === "ADMIN";
  return <main className="app-page maquette-page profile-page">
    <div className="profile-head">
      <div className="neu-raised profile-avatar">{user.image ? <img src={user.image} alt="" /> : (user.name?.[0] || "P")}</div>
      <h1>{user.name || "Collectionneur"}</h1>
      <p>{user.email}</p>
      <div className="plan">{isAdmin ? "✦ Administrateur" : "✦ Compte collectionneur"}</div>
    </div>

    <div className="profile-stat-row">
      <ProfileLink href="/collection/wishlist" value={favorites} label="Souhaits" icon="⭐" />
      <ProfileLink href="/collection" value={binders} label="Classeurs" icon="🗂️" />
      <ProfileLink href="/collection/sales" value={sales} label="Ventes" icon="🧾" />
    </div>

    <SettingsGroup label="Ma collection">
      <SettingLink href="/collection/wishlist" icon="⭐" title="Liste de souhaits" subtitle={`${favorites} élément(s) suivi(s)`} />
      <SettingLink href="/collection" icon="🃏" title="Classeurs et portefeuille" subtitle={`${binders} espace(s) de collection`} />
      <SettingLink href="/collection/sales" icon="🧾" title="Historique des ventes" subtitle={`${sales} vente(s) enregistrée(s)`} />
      <SettingLink href="/items" icon="📷" title="Analyse photo par IA" subtitle="Identifier une carte ou un item" />
    </SettingsGroup>

    {isAdmin && <SettingsGroup label="Administration">
      <SettingLink href="/settings" icon="⚙️" title="Configuration PokéDeal" subtitle="Scanner, filtres, imports et santé du système" />
    </SettingsGroup>}

    <SettingsGroup label="Compte">
      <SettingLink href="/privacy" icon="🔒" title="Politique de confidentialité" />
      <SettingLink href="/terms" icon="📄" title="Conditions d'utilisation" />
      <div className="setting-row"><div className="ico">🚪</div><div className="lbl"><div className="t">Déconnexion</div></div><AccountControl compact /></div>
    </SettingsGroup>
  </main>;
}

function SettingsGroup({ label, children }: { label: string; children: React.ReactNode }) { return <section className="settings-group"><div className="grouplabel">{label}</div><div className="settings-block neu-raised">{children}</div></section>; }
function SettingLink({ href, icon, title, subtitle }: { href: string; icon: string; title: string; subtitle?: string }) { return <Link href={href} className="setting-row"><div className="ico">{icon}</div><div className="lbl"><div className="t">{title}</div>{subtitle && <div className="s">{subtitle}</div>}</div><span className="chev">›</span></Link>; }
function ProfileLink({ href, value, label, icon }: { href:string; value:number; label:string; icon:string }) { return <Link href={href} className="neu-raised summary-card"><span>{icon}</span><div className="num">{value}</div><div className="lab">{label}</div></Link>; }
