/**
 * Deployed Contract Addresses
 *
 * This file contains the deployed addresses for the TOTP contracts.
 * Update these after deploying to a network.
 */

export const CONTRACT_ADDRESSES = {
  // Sepolia Testnet
  sepolia: {
    entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    verifier: "0xd3961aeac5f456a7efa3751a072a9ae5748c754b",
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
