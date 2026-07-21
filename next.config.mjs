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
    return config;
  },
};

export default nextConfig;
