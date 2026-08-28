import { BinderPage } from "@/components/collection/BinderPage";

export default async function PortfolioBinderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BinderPage id={id} />;
}
