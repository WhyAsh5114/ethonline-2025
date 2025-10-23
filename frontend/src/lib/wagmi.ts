import { coinbaseWallet, injected, walletConnect } from "@wagmi/connectors";
import { createConfig, http } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";

export const config = createConfig({
  chains: [sepolia, hardhat],
  connectors: [
    injected({
      target() {
        return {
          id: "injected",
          name: "Injected",
          provider: typeof window !== "undefined" ? window.ethereum : undefined,
        };
      },
    }),
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
  ssr: false,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
