// Source of truth for admin identity is the ADMIN_WALLETS env var, never
// the database alone (see CLAUDE.md PERAN & AKSES). Pure env parsing only —
// safe to import from Edge middleware.

function adminWalletSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_WALLETS ?? "")
      .split(",")
      .map((addr) => addr.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminWallet(address: string): boolean {
  return adminWalletSet().has(address.toLowerCase());
}
