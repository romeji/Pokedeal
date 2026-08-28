import { auth, googleAuthConfigured } from "@/auth";
import { isAdminRequest } from "@/lib/admin/auth";

export const LEGACY_ADMIN_USER_ID = "legacy-admin";

export type RequestUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  provider: "google" | "admin";
};

export async function getRequestUser(request: Request): Promise<RequestUser | null> {
  try {
    const session = await auth();
    if (session?.user?.id) {
      return {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
        role: session.user.role ?? "USER",
        provider: "google",
      };
    }
  } catch {
    // L'accès local par clé reste disponible si OAuth n'est pas encore configuré.
  }
  if (isAdminRequest(request)) {
    return { id: LEGACY_ADMIN_USER_ID, name: "Propriétaire PokéDeal", email: null, image: null, role: "ADMIN", provider: "admin" };
  }
  return null;
}

export { googleAuthConfigured };
