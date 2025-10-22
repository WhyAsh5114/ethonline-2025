import { coinbaseWallet, injected, walletConnect } from "@wagmi/connectors";
import { createConfig, http } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";

export const config = createConfig({
  chains: [hardhat, sepolia],
  connectors: [
    injected(),
    walletConnect({
      projectId:
        process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "demo-project-id",
    }),
    coinbaseWallet({
      appName: "ChronoVault",
    }),
  ],
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
