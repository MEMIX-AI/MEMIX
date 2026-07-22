/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // @wagmi/connectors' Coinbase "Base Account" connector pulls in
    // @coinbase/cdp-sdk's x402 payment code, which depends on @x402/*
    // packages that aren't installed and aren't published as regular
    // deps. We never touch that payment flow here (wallet connect is for
    // identity only, not transactions), so stub those imports out instead
    // of installing an unused, still-experimental payment stack.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/evm/upto/client": false,
      "@x402/evm/exact/client": false,
      "@x402/core/client": false,
      "@x402/svm/exact/client": false,
      "@x402/evm": false,
      // Optional peer deps pulled in by MetaMask SDK / WalletConnect's
      // logger that only matter in React Native or verbose-log setups.
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };

    // prisma/dev.db is inside the project tree and gets written on nearly
    // every request (session lookups, ApiKey.requestCount increments,
    // etc.). Without this, the dev watcher treats each write as a source
    // change and reloads route modules, wiping module-level state like
    // lib/rate-limit.ts's in-memory buckets on every single request.
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/prisma/dev.db*", "**/node_modules/**"],
    };
    return config;
  },
};

export default nextConfig;
