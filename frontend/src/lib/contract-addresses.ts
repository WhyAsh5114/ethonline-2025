/**
 * Deployed Contract Addresses
 *
 * This file contains the deployed addresses for the TOTP contracts.
 * Update these after deploying to a network.
 */

export const CONTRACT_ADDRESSES = {
  // Sepolia Testnet
  sepolia: {
    entryPoint: "0x8e711a94c3e72f05921d26f662c4bdf6e2be9007",
    verifier: "0x2f13fbfc771b708307cc40fc297550183147fd3e",
  },
  // Hardhat Local
  hardhat: {
    entryPoint: "",
    verifier: "",
  },
} as const;

export type NetworkName = keyof typeof CONTRACT_ADDRESSES;

/**
 * Get contract addresses for a specific network
 */
export function getContractAddresses(network: NetworkName) {
  return CONTRACT_ADDRESSES[network];
}

/**
 * Default network for development
 */
export const DEFAULT_NETWORK: NetworkName = "sepolia";
