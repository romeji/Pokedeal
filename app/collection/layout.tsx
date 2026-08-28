import { CollectionNav } from "@/components/collection/CollectionNav";

export default function CollectionLayout({ children }: { children: React.ReactNode }) {
  return <><CollectionNav />{children}</>;
}
