import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  return session.user;
}
