"use client";

import { useState } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { ProofVerification } from "@/components/proof-verification";
import { TOTPSetup } from "@/components/totp-setup";
import { TransactionExecution } from "@/components/transaction-execution";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalletConnect } from "@/components/wallet-connect";
import { WalletDeployment } from "@/components/wallet-deployment";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [secretHash, setSecretHash] = useState<bigint | null>(null);
  const [walletAddress, setWalletAddress] = useState<Address | null>(null);

  const handleTOTPComplete = (secret: string, hash: bigint) => {
    setTotpSecret(secret);
    setSecretHash(hash);
  };

  const handleWalletDeployed = (address: Address) => {
    setWalletAddress(address);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="mx-auto w-full max-w-md space-y-6 text-center">
          <div>
            <h1 className="text-3xl font-bold">Welcome to ChronoVault</h1>
            <p className="mt-2 text-muted-foreground">
              Connect your wallet to get started with TOTP-protected smart
              wallet
            </p>
          </div>
          <WalletConnect />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your TOTP-protected smart wallet
        </p>
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="setup">TOTP Setup</TabsTrigger>
          <TabsTrigger value="deploy" disabled={!secretHash}>
            Deploy Wallet
          </TabsTrigger>
          <TabsTrigger value="verify" disabled={!totpSecret}>
            Verify Proof
          </TabsTrigger>
          <TabsTrigger value="execute" disabled={!walletAddress}>
            Execute
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-6">
          <TOTPSetup onComplete={handleTOTPComplete} />
        </TabsContent>

        <TabsContent value="deploy" className="mt-6">
          <WalletDeployment
            secretHash={secretHash}
            onDeployed={handleWalletDeployed}
          />
        </TabsContent>

        <TabsContent value="verify" className="mt-6">
          <ProofVerification
            totpSecret={totpSecret}
            walletAddress={walletAddress}
          />
        </TabsContent>

        <TabsContent value="execute" className="mt-6">
          <TransactionExecution walletAddress={walletAddress} />
        </TabsContent>
      </Tabs>

      {/* Status Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">TOTP Status</p>
          <p className="mt-1 font-semibold">
            {secretHash ? "✓ Configured" : "Not Setup"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Wallet Status</p>
          <p className="mt-1 font-semibold">
            {walletAddress ? "✓ Deployed" : "Not Deployed"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-muted-foreground">Connected Address</p>
          <p className="mt-1 font-mono text-xs break-all">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
