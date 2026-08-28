import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/database/prisma";
import { isAdminEmail } from "@/lib/auth/roles";

export const googleAuthConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  trustHost: true,
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      const role = isAdminEmail(user.email)
        ? "ADMIN"
        : "role" in user && typeof user.role === "string" ? user.role : "USER";
      session.user.role = role;
      if (role === "ADMIN" && "role" in user && user.role !== "ADMIN") {
        await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      }
      return session;
    },
  },
});
