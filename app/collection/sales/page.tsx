import { SalesPanel } from "@/components/collection/SalesPanel";
import { requireUserPage } from "@/lib/auth/page-user";
export default async function SalesPage(){await requireUserPage();return <SalesPanel/>}
