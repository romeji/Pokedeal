import { WishlistPanel } from "@/components/collection/WishlistPanel";
import { requireUserPage } from "@/lib/auth/page-user";
export default async function WishlistPage(){await requireUserPage();return <WishlistPanel/>}
