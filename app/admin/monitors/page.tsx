import { MonitorManager } from "@/components/admin/MonitorManager";
import { requireAdminPage } from "@/lib/auth/page";

export default async function MonitorsPage() {
  await requireAdminPage();
  return <main className="p-5 md:p-10"><p className="eyebrow">Vintrack bridge</p><h1 className="mt-2 font-display text-4xl font-bold">Recherches temps réel</h1><p className="mt-2 max-w-3xl text-slate-400">Configure les recherches régionales lues par le worker Go. Chaque nouvelle annonce est dédupliquée puis transmise au pipeline PokéDeal.</p><section className="surface mt-8 p-6"><MonitorManager /></section></main>;
}
