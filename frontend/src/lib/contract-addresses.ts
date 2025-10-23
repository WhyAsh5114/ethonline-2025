/**
 * Deployed Contract Addresses
 *
 * This file contains the deployed addresses for the TOTP contracts.
 * Update these after deploying to a network.
 */

export const CONTRACT_ADDRESSES = {
  // Sepolia Testnet
  sepolia: {
    entryPoint: "0xdaffe41cfedb7843e215009f97f864249a573313",
    verifier: "0x62dd324a5dceff7a2d97bbf9d5dd499c6eb92e60",
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
