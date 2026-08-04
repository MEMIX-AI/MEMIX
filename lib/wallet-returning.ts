// Shared key for the "has this browser signed in before" localStorage
// flag — set by WalletButton once signed in, read by Navbar to decide
// whether to eager-mount the wallet bundle (silently, no modal) instead
// of waiting for a click. Kept in its own file since both a client
// component (WalletButton, inside the lazy-loaded wagmi bundle) and
// another client component (Navbar, in the main bundle) need it without
// pulling either one into the other's chunk.
export const WALLET_RETURNING_KEY = "mv_wallet_returning";
