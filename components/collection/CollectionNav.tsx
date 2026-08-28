"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/collection", label: "Portefeuille", icon: "◫" },
  { href: "/collection/blocks", label: "Blocs", icon: "▦" },
  { href: "/collection/wishlist", label: "Liste de souhaits", icon: "☆" },
  { href: "/collection/sales", label: "Ventes", icon: "↗" },
];

export function CollectionNav() {
  const pathname = usePathname();
  return <nav className="collection-subnav tabswitch no-scrollbar">{links.map((link) => {
    const active = link.href === "/collection" ? pathname === link.href : pathname.startsWith(link.href);
    return <Link key={link.href} href={link.href} className={active ? "active" : ""}><span>{link.icon}</span>{link.label}</Link>;
  })}</nav>;
}
