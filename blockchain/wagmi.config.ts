import { defineConfig } from '@wagmi/cli'
import { hardhat } from '@wagmi/cli/plugins'

export default defineConfig({
  out: 'generated.ts',
  contracts: [],
  plugins: [
    hardhat({
      project: '.',
      deployments: {
        Counter: {
          // Add your deployed contract addresses here
          // Example: 31337: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
        },
      },
    }),
  ],
})
