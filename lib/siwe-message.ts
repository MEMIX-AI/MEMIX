// Minimal EIP-4361-style message builder — hand-rolled instead of pulling
// in the `siwe` package (+ its ethers dependency) to keep the auth stack as
// light as the rest of the wallet integration. "SIWE-style, sederhana" per
// CLAUDE.md-adjacent instructions: it's a signed, nonce-bound statement,
// not full EIP-4361 message parsing/validation.
export interface SiweMessageParams {
  address: string;
  nonce: string;
  chainId: number;
}

export function buildSiweMessage({
  address,
  nonce,
  chainId,
}: SiweMessageParams): string {
  const domain = window.location.host;
  const uri = window.location.origin;
  const issuedAt = new Date().toISOString();

  return `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in to memix. This request will not trigger a blockchain transaction or cost any gas fees.

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;
}
