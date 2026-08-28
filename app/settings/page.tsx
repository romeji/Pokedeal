import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/page";

const sections = [
  { href: "/admin/monitors", icon: "◎", title: "Scanner temps réel", text: "Recherches, pays, prix et fréquence du worker Go." },
  { href: "/admin/filters", icon: "⌁", title: "Filtres intelligents", text: "Faux produits, emballages vides, états et mots-clés." },
  { href: "/admin/imports", icon: "⇣", title: "Sources & imports", text: "Cardmarket, Gemini, Telegram et fichiers officiels." },
  { href: "/admin/system", icon: "◉", title: "Santé du système", text: "Base, workers, conformité et dernières exécutions." },
];

export default async function SettingsPage() {
  const user = await requireAdminPage();
  return <main className="app-page"><header className="page-hero"><p className="eyebrow">Réservé au propriétaire</p><h1>Configuration</h1><p>Connecté en tant que {user.email}. Ces réglages ne sont visibles que par ton compte administrateur.</p></header><section className="app-grid-3 mt-8">{sections.map((section)=><Link key={section.href} href={section.href} className="neu-card interactive-card"><span className="feature-icon">{section.icon}</span><h2>{section.title}</h2><p>{section.text}</p><span className="card-link">Ouvrir →</span></Link>)}</section></main>;
}
