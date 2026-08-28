"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Accueil", icon: "⌂" },
  { href: "/library", label: "Deals", icon: "◈" },
  { href: "/collection", label: "Collection", icon: "◇" },
  { href: "/items", label: "Prix", icon: "⌕" },
  { href: "/profile", label: "Profil", icon: "○" },
];

export function MobileNav() {
  const pathname = usePathname();
  return <nav className="mobile-dock md:hidden" aria-label="Navigation principale">
    {links.map((link) => <Link key={link.href} href={link.href} className={`mobile-dock-link ${pathname.startsWith(link.href) ? "active" : ""}`}><span>{link.icon}</span><small>{link.label}</small></Link>)}
  </nav>;
}
