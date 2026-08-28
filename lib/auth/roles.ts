const OWNER_EMAIL = "lopes.jerome21@gmail.com";

export function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS || OWNER_EMAIL)
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email?: string | null) {
  return Boolean(email && adminEmails().has(email.trim().toLowerCase()));
}
