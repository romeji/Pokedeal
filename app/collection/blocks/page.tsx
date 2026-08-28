import { BlocksExplorer } from "@/components/collection/BlocksExplorer";
import { requireUserPage } from "@/lib/auth/page-user";

export default async function BlocksPage() {
  await requireUserPage();
  return <BlocksExplorer />;
}
